export function AboutPage() { return <Info eyebrow="About the system" title="Built for a better campus" copy="The School Facility Complaint Monitoring System connects students, maintenance teams, and school administrators in one transparent workflow. It replaces scattered messages and paper forms with secure, trackable reports." /> }

const mission = [
  ['I', 'Innovative Filipinos in technological, academic training and lifelong learning for quality education.'],
  ['B', 'Balanced education for the total development of the learning individual to cope with technological and social change.'],
  ['A', 'Affordable tuition fees and access to developmental programs and services.'],
  ['C', 'Capability building opportunities to all its faculty and staff towards quality assurance.'],
  ['M', 'Milestone of advanced education and training in Mindanao and the world.'],
]

const goals = [
  'Provide fair avenues for all families of the society to acquire quality education and training.',
  'Provide opportunities for the acquisition of various skills and competencies through relevant and advanced training for quality assurance.',
  'Address the gap in skill-employment mismatch for job proficiency.',
  'Develop faculty members and staff to be effective, efficient, innovative, and committed team builders.',
  'Transform education and training through technological advancement and modernization.',
  'Utilize research and extension as imperative tools in achieving sustainable change and development in the Province of Bukidnon and Mindanao.',
]

const values = [
  ['Responsibility', 'IBACM assumes responsibility of giving equal opportunities and access to affordable, relevant, standard, and quality education and training to the community.'],
  ['Employability', 'IBACM believes in the employability and marketability of its graduates qualified to meet world-class standards.'],
  ['Assurance', 'IBACM assures the community of enhanced living conditions by producing its graduates envisioning environmental concern awareness.'],
  ['Love', 'IBACM continues to pursue its love for education and training for all Filipino learners.'],
]

export function VisionMissionPage() {
  return <main className="min-h-screen bg-slate-50 px-5 pb-20 pt-32 text-slate-700">
    <div className="mx-auto max-w-6xl">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[.25em] text-forest-600">Our direction and purpose</p>
        <h1 className="display mt-3 text-4xl text-[#800000] sm:text-5xl">IBA College of Mindanao, Inc.</h1>
        <div className="mx-auto mt-5 h-1 w-20 rounded-full bg-amber-400"/>
      </header>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="display text-3xl text-[#800000]">Mission</h2>
          <p className="mt-4 font-semibold text-slate-600">IBA College of Mindanao, Inc. adheres to provide:</p>
          <ul className="mt-5 space-y-3">
            {mission.map(([letter, copy]) => <li className="flex gap-3 leading-7" key={letter}><b className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-100 text-[#800000]">{letter}</b><span>{copy}</span></li>)}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="display text-3xl text-[#800000]">Goals &amp; Objectives</h2>
          <ol className="mt-5 space-y-3">
            {goals.map((goal, index) => <li className="flex gap-3 leading-7" key={goal}><b className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest-50 text-forest-700">{index + 1}</b><span>{goal}</span></li>)}
          </ol>
        </section>
      </div>

      <section className="mt-6 rounded-2xl bg-forest-900 p-7 text-white shadow-sm sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-amber-400">Our aspiration</p>
        <h2 className="display mt-2 text-3xl">Vision</h2>
        <p className="mt-4 max-w-4xl text-lg leading-8 text-white/75">IBA College of Mindanao, Inc. envisions becoming Mindanao&apos;s leading academic and technological training institution needed by the 21st global century learners and international job market.</p>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="display text-center text-3xl text-[#800000]">Value Statement</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {values.map(([name, copy]) => <article className="rounded-xl border border-slate-100 bg-slate-50 p-5" key={name}><h3 className="font-bold text-[#800000]">{name}</h3><p className="mt-2 leading-7">{copy}</p></article>)}
        </div>
      </section>
    </div>
  </main>
}

function Info({eyebrow,title,copy}:{eyebrow:string;title:string;copy:string}) { return <main className="grid min-h-screen place-items-center bg-white px-5 pt-24 text-slate-800"><div className="max-w-2xl text-center"><span className="inline-flex rounded-full bg-amber-100 px-4 py-2 text-xs font-bold uppercase tracking-[.2em] text-forest-800">{eyebrow}</span><h1 className="display mt-5 text-5xl text-forest-900">{title}</h1><div className="mx-auto mt-5 h-1 w-20 rounded-full bg-amber-400"/><p className="mt-6 text-lg leading-8 text-slate-600">{copy}</p></div></main> }
