// uniVERSE — blog posts
// Single source of truth for both blog.html (listing) and
// blog-post.html (single post view, matched by slug).
//
// To add a new post: add an object to this array. No build step,
// no CMS — just edit this file and re-upload it.
//
// Categories (fixed set):
//   Academic Power, Student Intelligence, Systems & Execution,
//   Opportunities & Exposure, Faith & Alignment, Campus Connection,
//   Transformation Stories

const BLOG_POSTS = [
  {
    slug: "the-past-question-system-that-actually-works",
    title: "The Past Question System That Actually Works",
    category: "Academic Power",
    date: "2027-01-14",
    excerpt: "Most students collect past questions. Almost none of them use a system that turns those questions into an actual score improvement. Here's the three-pass method.",
    content: [
      "Collecting past questions isn't the hard part. Everyone has a folder of PDFs from three sessions back sitting untouched on their phone. The hard part is turning that pile into marks — and that only happens with a system, not a vibe.",
      "Here's the three-pass method. First pass: solve every past question cold, no notes, no textbook, timed like the real exam. Mark what you got wrong without explaining it to yourself yet — just a red dot. This tells you exactly where the gaps are, not where you assume they are.",
      "Second pass: go back only to the red-dot questions. This time, work through them slowly with your notes open, and write down the specific concept you missed — not \"I forgot this,\" but the actual rule, formula, or definition that would have gotten you the mark. This step is where most students quit, because it's the least satisfying one. It's also the one doing all the work.",
      "Third pass: two or three days later, redo the red-dot questions cold again, no notes. If you get it right this time, the gap is closed. If you get it wrong again, that concept goes on a short list you review the morning of the exam — not the night before, the morning of, when it's freshest.",
      "The reason this beats \"just do past questions\" is specificity. A pile of solved questions tells you nothing about what you don't know. A list of five concepts you keep missing tells you exactly what to fix in the two days you actually have before the exam.",
    ],
  },
  {
    slug: "why-your-study-group-keeps-dying",
    title: "Why Your Study Group Keeps Dying After One Week",
    category: "Student Intelligence",
    date: "2027-01-20",
    excerpt: "It's not because everyone got busy. It's because nobody defined what the group was actually for, so it had nothing to survive on once the excitement wore off.",
    content: [
      "Every study group starts the same way: someone creates a WhatsApp group after a hard test, five people join with real intention, and by week two it's just birthday messages and \"any updates on the assignment.\"",
      "The reason isn't that people got busy — everyone's always busy, that's not new information. The reason is that the group was formed around a feeling (\"we should study together\") instead of a structure (what, when, who's responsible for what). A feeling doesn't survive a bad week. A structure does, because it doesn't ask anyone to feel motivated — it just asks them to show up to something specific.",
      "A group that actually lasts has three things decided before the first session: what you're covering each week (not \"we'll figure it out\"), who's presenting or leading that topic (rotate it, don't let one person carry it forever), and a fixed time that doesn't move based on how people are feeling that day.",
      "The uncomfortable part: if nobody in your group is willing to commit to those three things, it was never really a study group. It was a group chat with good intentions, and those don't show up on your transcript.",
    ],
  },
  {
    slug: "the-weekly-reset-that-replaced-my-to-do-list",
    title: "The Weekly Reset That Replaced My To-Do List",
    category: "Systems & Execution",
    date: "2027-02-02",
    excerpt: "Daily to-do lists fail because they're written by someone who doesn't know what the week actually looks like yet. Here's the 20-minute reset that fixed it.",
    content: [
      "A daily to-do list written every morning has a flaw nobody talks about: it's written by a version of you who hasn't seen the whole week yet. You write Monday's list without knowing that Wednesday has a surprise test and Thursday has a family thing, so by Wednesday the list is already wrong and you feel behind for no real reason.",
      "The fix isn't a better app. It's moving the planning up one level — from daily to weekly — and doing it once, on Sunday, for twenty minutes.",
      "The reset has three parts. First, write down every fixed commitment for the week — classes, tests, church, work, anything with a time attached that you don't control. Second, list the two or three things that would make the week a genuine win if they got done — not ten things, two or three, because a list of ten is a list you'll ignore by Tuesday. Third, look at the fixed commitments and physically slot the two or three priorities into actual gaps in the week, not \"sometime this week.\"",
      "The difference this makes: when Wednesday's surprise test happens, you're not rebuilding your whole plan from panic. You already know which of your two or three priorities can slide and which can't, because you decided that on Sunday with a clear head instead of Wednesday with a stressed one.",
    ],
  },
  {
    slug: "internship-applications-nobody-tells-you-about",
    title: "The Internship Applications Nobody Tells You About",
    category: "Opportunities & Exposure",
    date: "2027-02-10",
    excerpt: "Most students only apply to the internships everyone else is applying to. The real advantage is in the ones with almost no applicants — here's how to actually find them.",
    content: [
      "Everyone in your department is applying to the same three or four well-known internship programs — the ones with the polished Instagram pages and the deadline everyone reminds each other about. That's exactly why your odds there are average at best.",
      "The programs worth chasing are the ones with almost no visible marketing: a small company's own website careers page, a research lab's mailing list, a professor's project that needs an extra pair of hands and has never been advertised as an \"internship\" at all. These have a fraction of the applicants because most students don't think to look — they wait for the opportunity to come pre-packaged and announced in a WhatsApp group.",
      "A concrete way to find these: pick five companies or organizations actually doing work in your field, and go directly to their website's careers or \"contact us\" page instead of a job board. Send a short, specific email — not \"I am interested in opportunities,\" but naming one thing they've actually done and asking if they take on students for a defined period. Most won't reply. The ones that do are having a conversation with almost nobody else.",
      "This takes more effort than scrolling a job board, which is exactly why it works — the effort itself is the filter that keeps most students out.",
    ],
  },
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = BLOG_POSTS;
}
