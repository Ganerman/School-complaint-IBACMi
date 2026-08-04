export function AboutPage() { return <main className="relative min-h-screen overflow-hidden bg-[#fffdf8] px-5 pb-24 pt-32 text-slate-700">
  <div className="absolute -right-24 top-40 h-72 w-72 rounded-full bg-amber-100/60 blur-3xl"/>
  <div className="absolute -left-24 bottom-16 h-72 w-72 rounded-full bg-forest-100/60 blur-3xl"/>
  <div className="relative mx-auto max-w-6xl">
    <header className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-bold uppercase tracking-[.25em] text-forest-600">About our institution</p>
      <h1 className="display mt-3 text-4xl text-[#800000] sm:text-5xl">IBA College of Mindanao, Inc.</h1>
      <div className="mx-auto mt-5 h-1 w-20 rounded-full bg-amber-400"/>
      <h2 className="mt-7 text-xl font-bold text-slate-900 sm:text-2xl">Birth and Creation of IBACM</h2>
    </header>

    <section className="mt-10 rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-sm backdrop-blur sm:p-10">
      <div className="grid gap-x-12 gap-y-6 text-[15px] leading-8 text-slate-600 lg:grid-cols-2">
        <div className="space-y-6">
          <p><strong className="text-forest-800">IBA College of Mindanao</strong>, founded in 2004 by Dr. Reynaldo B. Antonio, Sr. and Dr. Irene B. Antonio, retired public school teachers and private school administrators. With their untiring desire to support and to help the youth in the province of Bukidnon, they decided to establish their own school, the IBA College of Mindanao.</p>
          <p>IBA College of Mindanao is a non-stock, non-profit, private educational institution offering Basic Education, Higher Education and Technical-Vocational Education. The first branch was established in Kalilangan, Bukidnon in 2005; the second branch was established in Quezon, Bukidnon in 2006; and the third branch was established in Valencia City, Bukidnon in 2007. It also has one annex campus situated at Purok 21, Valencia City.</p>
          <p>The flourishing of the two branches ushered the birth of the IBACM Valencia branch in 2007, which serves as the main college campus.</p>
        </div>
        <div className="space-y-6">
          <p>The year 2006 became a monumental year for the college in its Salawagan, Quezon, Bukidnon branch with the addition of degree programs to its eighteen registered qualifications approved by TESDA. The first CHED-recognized courses offered were Bachelor of Science in Criminology (BSCRIM), Bachelor of Public Administration (BPA), Bachelor of Science in Entrepreneurship (BSENTREP), and Bachelor of Elementary Education (BEED).</p>
          <p>The main campus also offered eighteen registered WTR TESDA qualifications approved by UTPRAS. IBACM continued to serve the community by adding Bachelor of Science in Hotel and Restaurant Management (BSHRM) and Bachelor of Science in Information Technology (BSIT). Bachelor of Elementary Education with specialization in Early Childhood Education was offered in 2013.</p>
          <p>Today, the Kalilangan and Quezon, Bukidnon branches have ceased operation, making the main branch and the annex campus the existing home and training ground for teaching and learning.</p>
        </div>
      </div>
    </section>
  </div>
</main> }

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
