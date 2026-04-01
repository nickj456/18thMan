import { Composition } from 'remotion'
import { DrillCard, drillCardSchema } from './compositions/DrillCard'
import { SessionRecap, sessionRecapSchema } from './compositions/SessionRecap'
import { LogoReveal } from './compositions/LogoReveal'
import { DrillAnimation, drillAnimationSchema } from './compositions/DrillAnimation'

export const RemotionRoot = () => {
  return (
    <>
      {/* 9:16 vertical — Instagram/TikTok stories */}
      <Composition
        id="DrillCard"
        component={DrillCard}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        schema={drillCardSchema}
        defaultProps={{
          drillTitle: 'Dummy Half Play',
          category: 'Attack',
          difficulty: 'intermediate',
          playerCount: '13',
          coachingCues: [
            'Head up, scan the defence',
            'Low body position off the line',
            'Communicate early',
          ],
          canvasPreviewUrl: null,
        }}
      />

      {/* 1:1 square — Instagram feed */}
      <Composition
        id="DrillCardSquare"
        component={DrillCard}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1080}
        schema={drillCardSchema}
        defaultProps={{"drillTitle":"Skill Drills","category":"Attack","difficulty":"intermediate" as const,"playerCount":"13","coachingCues":["Head up, scan the defence","Grip | Catch | Pass","Movement and Communication"],"canvasPreviewUrl":null}}
      />

      {/* 9:16 session recap */}
      <Composition
        id="SessionRecap"
        component={SessionRecap}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
        schema={sessionRecapSchema}
        defaultProps={{
          sessionTitle: 'Friday Attack Session',
          coachName: 'Nick Johnson',
          totalDuration: 90,
          drills: [
            { title: 'Dummy Half Play', duration: 15, category: 'Attack' },
            { title: 'Kick Chase Drill', duration: 20, category: 'Kicking' },
            { title: 'Short Side Defence', duration: 20, category: 'Defence' },
            { title: 'Completion Sets', duration: 20, category: 'Attack' },
            { title: 'Scrimmage', duration: 15, category: 'General' },
          ],
        }}
      />

      {/* 16:9 animated drill — exported from designer */}
      <Composition
        id="DrillAnimation"
        component={DrillAnimation}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1280}
        schema={drillAnimationSchema}
        defaultProps={{
          drillTitle: 'Sample Drill',
          canvasJson: {
            background: 'full' as const,
            elements: [],
            keyframes: [],
            duration: 90,
          },
        }}
      />

      {/* 1:1 logo reveal / app promo */}
      <Composition
        id="LogoReveal"
        component={LogoReveal}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{}}
      />
    </>
  )
}
