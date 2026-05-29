-- 050_wellbeing_resources.sql
-- Creates the wellbeing_resources table with enum type, RLS policies,
-- updated_at trigger, and seed data.

-- 1. Enum type
create type public.wellbeing_resource_type as enum (
  'nutrition_plan',
  'nutrition_guide',
  'mental_health'
);

-- 2. Table
create table public.wellbeing_resources (
  id          uuid primary key default gen_random_uuid(),
  type        public.wellbeing_resource_type not null,
  title       text not null,
  subtitle    text,
  content     jsonb not null default '{}',
  sort_order  integer not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3. Enable RLS
alter table public.wellbeing_resources enable row level security;

-- 4. RLS policies
create policy wellbeing_select
  on public.wellbeing_resources
  for select
  to authenticated
  using (true);

create policy wellbeing_insert
  on public.wellbeing_resources
  for insert
  to authenticated
  with check (public.is_admin());

create policy wellbeing_update
  on public.wellbeing_resources
  for update
  to authenticated
  using (public.is_admin());

create policy wellbeing_delete
  on public.wellbeing_resources
  for delete
  to authenticated
  using (public.is_admin());

-- 5. updated_at trigger
create trigger set_updated_at
  before update on public.wellbeing_resources
  for each row
  execute procedure public.handle_updated_at();

-- 6. Seed data

-- Resource 1: nutrition_plan
insert into public.wellbeing_resources (type, title, subtitle, sort_order, content)
values (
  'nutrition_plan',
  'Rugby Performance Nutrition Plan',
  'Daily meal schedule for young athletes aged 12–18',
  1,
  $json$
{
  "athlete_profile": {
    "age": "14 years old",
    "height": "6'1\"",
    "weight": "164 lbs",
    "goal": "Optimize Muscle Growth & Maintain Lean Body Composition"
  },
  "daily_calories": "3,200 – 3,500",
  "meals": [
    { "name": "Breakfast", "description": "Large bowl of porridge oats with whole milk, topped with walnuts, chia seeds, and a sliced banana. Plus 3 scrambled eggs." },
    { "name": "Mid-Morning", "description": "Large tub of Greek yogurt (5% fat) with mixed berries and a handful of almonds or a scoop of whey protein." },
    { "name": "Lunch", "description": "2 grilled chicken breasts or tuna steak, large portion of brown rice, half an avocado, and steamed broccoli/spinach." },
    { "name": "Pre-Training", "description": "A bagel with peanut butter and honey OR a large apple with a handful of cashews. Eat 60–90 mins before training." },
    { "name": "Post-Training", "description": "Protein shake with milk and a banana. Follow with a full meal within 90 minutes." },
    { "name": "Dinner", "description": "Lean ground beef/turkey (Bolognese or Chili), whole-wheat pasta or large sweet potato, and mixed roasted vegetables." },
    { "name": "Before Bed", "description": "Glass of whole milk or a bowl of cottage cheese — casein protein for overnight recovery." }
  ],
  "habits": [
    { "title": "Hydration", "detail": "Drink 3–4 litres of water daily. Use electrolyte drinks during heavy matches or long training sessions." },
    { "title": "Consistency", "detail": "Never skip meals. If not hungry, drink a high-calorie smoothie (oats, milk, peanut butter, protein)." },
    { "title": "Sleep", "detail": "Aim for 9–10 hours. Muscle grows while you sleep, not while you are training." },
    { "title": "Protein Focus", "detail": "Aim for 200g+ of protein daily spread across all meals to keep muscle synthesis high." }
  ]
}
$json$::jsonb
);

-- Resource 2: nutrition_guide
insert into public.wellbeing_resources (type, title, subtitle, sort_order, content)
values (
  'nutrition_guide',
  'Nutrition & Recovery Guide for Young Athletes',
  'Macronutrients, hydration, and sleep for peak performance',
  2,
  $json$
{
  "sections": [
    {
      "title": "Macronutrients",
      "items": [
        { "name": "Carbohydrates", "detail": "The body's primary fuel source for high-intensity sport. Focus on complex carbs — whole grains, vegetables, fruit. Aim for 50–60% of total diet." },
        { "name": "Proteins", "detail": "Essential for muscle repair and growth. Sources include lean meats, fish, tofu, and beans. Aim for 15–20% of total diet." },
        { "name": "Fats", "detail": "Necessary for hormone production and long-term energy. Focus on unsaturated fats — nuts, seeds, avocados, olive oil. Aim for 20–30% of total diet." }
      ]
    },
    {
      "title": "Micronutrients",
      "items": [
        { "name": "Key Nutrients", "detail": "Calcium (dairy, leafy greens) for bone health. Iron (lean meats, spinach) for energy. Vitamin D (sunlight, fortified foods) for immunity and bone strength." }
      ]
    },
    {
      "title": "Pre & Post Training Nutrition",
      "items": [
        { "name": "Pre-Training", "detail": "Eat 2–3 hours before exercise. Focus on carbs and protein — oatmeal with fruit, whole grain toast with peanut butter, or a banana with almonds." },
        { "name": "Post-Training", "detail": "Replenish energy and repair muscles within 30–60 minutes. Try chocolate milk, a turkey wrap, or Greek yogurt with granola." }
      ]
    },
    {
      "title": "Hydration",
      "items": [
        { "name": "Daily Intake", "detail": "Drink water regularly throughout the day. 500ml two hours before training, sip every 15–20 minutes during, rehydrate with water or sports drinks after." }
      ]
    },
    {
      "title": "Sleep",
      "items": [
        { "name": "Recovery", "detail": "Athletes need 8–10 hours per night. During sleep the body repairs muscles and consolidates skills. Consistent bedtimes, relaxing routines, and limiting screen time all help." }
      ]
    }
  ],
  "example_day": [
    { "meal": "Breakfast", "food": "Oatmeal with berries" },
    { "meal": "Snack", "food": "Mixed nuts and an apple" },
    { "meal": "Lunch", "food": "Grilled chicken salad with quinoa" },
    { "meal": "Snack", "food": "Greek yogurt with honey" },
    { "meal": "Dinner", "food": "Salmon, roasted sweet potatoes, and broccoli" }
  ]
}
$json$::jsonb
);

-- Resource 3: mental_health
insert into public.wellbeing_resources (type, title, subtitle, sort_order, content)
values (
  'mental_health',
  'Ahead of the Game',
  'A youth mental fitness programme delivered through sport',
  3,
  $json$
{
  "programme": "Movember Ahead of the Game",
  "partner": "Rugby League Cares",
  "url": "https://rugbyleaguecares.org/ahead-of-the-game",
  "stats": [
    { "value": "20,000+", "label": "youngsters educated per year" },
    { "value": "99%", "label": "engagement rate" },
    { "value": "100%", "label": "positive feedback" }
  ],
  "summary": "Research shows that 50% of adults diagnosed with a mental health problem experience their first symptoms by age 14, and 75% by age 18. Ahead of the Game targets young athletes aged 12–18, emphasising early intervention, addressing anxiety and depression, and teaching ways to support struggling peers.",
  "delivery": [
    { "channel": "Community sports clubs", "detail": "Player workshops plus specially-designed sessions for parents and coaches." },
    { "channel": "Schools", "detail": "Delivered within schools as part of PE sessions and wellbeing days." }
  ],
  "facilitators": "Delivered by current or former professional rugby league players who share personal experiences, inspiring young people to open up.",
  "testimonials": [
    { "quote": "The main thing I took away was how to show up for my mates. It's good to know we all have each other's backs.", "attribution": "Joe, aged 13" },
    { "quote": "Now I know how to help. I didn't really get what anxiety was until it was explained with sports examples.", "attribution": "Grace, aged 15" },
    { "quote": "I'd never thought about my mental fitness being something I needed to train. Now I know it's important to talk more to be happy off the pitch too.", "attribution": "Noah, aged 12" },
    { "quote": "One of my favourite phrases used to be 'Man Up'. Ahead of the Game has made me realise how damaging that might be.", "attribution": "U14s Coach" }
  ],
  "contact": "info@rlcares.org.uk"
}
$json$::jsonb
);
