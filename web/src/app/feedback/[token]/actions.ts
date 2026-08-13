'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { feedbackRequestEligibility } from '@/lib/coach-dna/feedback-request-status'
import { hashDeviceFingerprint } from '@/lib/coach-dna/device-fingerprint'
import { checkSafeguardingConcern } from '@/lib/coach-dna/safeguarding'
import type { RespondentType } from '@/lib/supabase/types'

export type SubmitFeedbackState = { error?: string; success?: boolean }

const GENERIC_ERROR = 'Something went wrong submitting your feedback. Please try again.'

export async function submitFeedbackResponse(
  token: string,
  _prevState: SubmitFeedbackState,
  formData: FormData,
): Promise<SubmitFeedbackState> {
  try {
    const supabase = createServiceClient()

    const { data: request } = await supabase
      .from('feedback_requests')
      .select('id, feedback_type, status, expires_at')
      .eq('token', token)
      .maybeSingle()
    if (!request) return { error: 'This feedback link is no longer valid.' }

    const eligibility = feedbackRequestEligibility(request)
    if (eligibility === 'expired') return { error: 'This feedback request has expired.' }
    if (eligibility === 'paused') return { error: 'This coach is not currently accepting feedback on this link.' }

    let respondentType: RespondentType
    if (request.feedback_type === 'peer_observation') {
      respondentType = 'peer_coach'
    } else {
      const submitted = formData.get('respondentType')
      if (submitted !== 'player' && submitted !== 'parent') {
        return { error: 'Please select whether you are the player or a parent.' }
      }
      respondentType = submitted
    }

    const { data: questions } = await supabase
      .from('assessment_questions')
      .select('id, question_format')
      .eq('assessment_type', request.feedback_type)
      .eq('active', true)
      .order('display_order')
    const ratingQuestions = (questions ?? []).filter(q => q.question_format === 'rating_scale')
    const freeTextQuestion = (questions ?? []).find(q => q.question_format === 'free_text')
    if (ratingQuestions.length !== 8 || !freeTextQuestion) return { error: GENERIC_ERROR }

    const ratings = new Map<string, number>()
    for (const q of ratingQuestions) {
      const raw = formData.get(`rating-${q.id}`)
      const value = Number(raw)
      if (!raw || !Number.isInteger(value) || value < 1 || value > 5) {
        return { error: 'Please rate every statement before submitting.' }
      }
      ratings.set(q.id, value)
    }

    const rawComment = (formData.get('comment') as string | null)?.trim()
    const comment = rawComment ? rawComment : null

    const deviceId = (formData.get('deviceId') as string | null) ?? ''
    const fingerprint = hashDeviceFingerprint(deviceId, token)

    const { data: existing } = await supabase
      .from('feedback_responses')
      .select('id')
      .eq('feedback_request_id', request.id)
      .eq('device_fingerprint_hash', fingerprint)
      .maybeSingle()
    if (existing) return { error: "You've already submitted feedback for this request." }

    const { data: response, error: responseError } = await supabase
      .from('feedback_responses')
      .insert({
        feedback_request_id: request.id,
        respondent_type: respondentType,
        held_for_review: true,
        device_fingerprint_hash: fingerprint,
      })
      .select('id')
      .single()
    if (responseError || !response) return { error: GENERIC_ERROR }

    const answerRows: { feedback_response_id: string; question_id: string; numeric_value?: number; written_value?: string }[] =
      ratingQuestions.map(q => ({
        feedback_response_id: response.id,
        question_id: q.id,
        numeric_value: ratings.get(q.id),
      }))
    if (comment) {
      answerRows.push({ feedback_response_id: response.id, question_id: freeTextQuestion.id, written_value: comment })
    }

    const { data: insertedAnswers, error: answersError } = await supabase
      .from('feedback_answers')
      .insert(answerRows)
      .select('id, question_id')
    if (answersError) return { error: GENERIC_ERROR }

    if (comment) {
      const flagged = await checkSafeguardingConcern(comment)
      if (flagged) {
        const freeTextAnswer = (insertedAnswers ?? []).find(a => a.question_id === freeTextQuestion.id)
        if (freeTextAnswer) {
          const { error: flagError } = await supabase.from('safeguarding_flags').insert({
            feedback_answer_id: freeTextAnswer.id,
            flagged_text: comment,
            detection_method: 'automated',
          })
          if (flagError) console.error('[feedback] failed to record safeguarding flag', flagError)
        }
        return { success: true }
      }
    }

    await supabase.from('feedback_responses').update({ held_for_review: false }).eq('id', response.id)
    return { success: true }
  } catch (error) {
    console.error('[feedback] unexpected error submitting response', error)
    return { error: GENERIC_ERROR }
  }
}
