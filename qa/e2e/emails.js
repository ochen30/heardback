// Realistic test emails (fictionalized but modeled on real ATS / recruiter mail). exp.at = "YYYY-MM-DD HH:MM" local or null
module.exports = [
  { id: 'greenhouse-confirm', exp: { kind: 'confirmation', company: 'Stripe', title: 'Software Engineering Intern', at: null },
    text: `From: Stripe Recruiting <no-reply@us.greenhouse-mail.io>
Subject: Thank you for applying to Stripe
Date: Mon, 2 Nov 2026 10:12:44 +0000

Hi Alex,

Thanks for applying to Stripe! Your application for the Software Engineering Intern role has been received and our team will review it shortly.

If your experience is a good match, someone from our recruiting team will reach out to schedule an interview. Due to the volume of applications, we are unable to respond to everyone individually.

Best,
The Stripe Recruiting Team` },
  { id: 'lever-confirm', exp: { kind: 'confirmation', company: 'Plaid', title: 'Software Engineer - New Grad', at: null },
    text: `From: Plaid <no-reply@hire.lever.co>
Subject: Thank you for your application to Plaid
Date: Sun, 1 Nov 2026 18:03:10 +0000

Hi Alex,

Thank you for your interest in Plaid! We wanted to let you know we received your application for Software Engineer - New Grad, and we are delighted that you would consider joining our team.

Our team will review your application and will be in touch if your qualifications match our needs for the role.

Regards,
Plaid` },
  { id: 'workday-confirm', exp: { kind: 'confirmation', company: 'Capital One', title: 'Technology Internship Program - Summer 2027', at: null },
    text: `From: Capital One <capitalone@myworkday.com>
Subject: Application Received - Technology Internship Program - Summer 2027 (R212345)
Date: Fri, 30 Oct 2026 14:22:01 -0400

Dear Alex,

Thank you for applying to the Technology Internship Program - Summer 2027 position at Capital One. We have received your application and it is currently under review.

You can check the status of your application at any time by signing in to your candidate home page.

Sincerely,
Capital One Talent Acquisition` },
  { id: 'recruiter-screen', exp: { kind: 'screen', company: 'Datadog', title: 'Software Engineer Intern', at: '2026-11-10 15:30' },
    text: `From: Jordan Lee <jordan.lee@datadoghq.com>
Subject: Datadog - Next steps for the Software Engineer Intern role
Date: Tue, 3 Nov 2026 09:41:00 -0500

Hi Alex,

Thanks for applying to the Software Engineer Intern role at Datadog. I'm a recruiter on the early careers team and I'd love to set up a 30-minute phone screen to learn more about you.

Would Tuesday, November 10 at 3:30 PM ET work for you? If not, send me a couple of times that work this week.

Thanks,
Jordan Lee
Technical Recruiter, Datadog` },
  { id: 'virtual-onsite', exp: { kind: 'interview', company: 'Robinhood', title: 'Software Engineer Intern', at: '2026-11-16 10:00' },
    text: `From: Robinhood Interviews <interviews@robinhood.com>
Subject: Interview Confirmation: Software Engineer Intern
Date: Wed, 4 Nov 2026 16:10:00 -0800

Hi Alex,

Your virtual onsite with Robinhood is confirmed for Monday, Nov 16, 2026 from 10:00am - 1:00pm PT. You'll meet with three engineers for two coding sessions and one behavioral conversation.

A Zoom link will follow 24 hours before your interview.

Robinhood Recruiting Coordination` },
  { id: 'numeric-date-tech', exp: { kind: 'interview', company: 'Duolingo', title: 'Software Engineer Intern', at: '2026-11-12 14:00' },
    text: `From: Maya Patel <maya@duolingo.com>
Subject: Duolingo technical interview
Date: Tue, 3 Nov 2026 12:00:00 -0500

Hi Alex,

Great news: we'd like to move you forward to a technical interview for the Software Engineer Intern position at Duolingo. I have you down for Thursday 11/12 at 2pm ET (45 minutes, one coding question in CoderPad).

Let me know if that works.

Maya` },
  { id: 'rejection-after-interview', exp: { kind: 'rejection', company: 'Ramp', title: 'Software Engineer Intern', at: null },
    text: `From: Ramp Recruiting <recruiting@ramp.com>
Subject: Update from Ramp
Date: Mon, 2 Nov 2026 17:30:00 -0500

Hi Alex,

Thank you for taking the time to interview with us for the Software Engineer Intern position. We truly enjoyed getting to know you and learning about your work.

After a lot of deliberation, we've decided to move forward with other candidates whose experience more closely matches our needs at this time.

We wish you the best in your search.
Ramp Recruiting` },
  { id: 'offer', exp: { kind: 'offer', company: 'Figma', title: 'Software Engineer Intern', at: null },
    text: `From: Emily Chen <emily.chen@figma.com>
Subject: Congratulations from Figma!
Date: Tue, 3 Nov 2026 13:15:00 -0800

Hi Alex,

Congratulations! On behalf of the whole team, I'm thrilled to extend you an offer for the Software Engineer Intern position at Figma for Summer 2027.

You'll receive the details in DocuSign shortly. Let's find a time this week to walk through compensation and answer any questions.

Emily` },
  { id: 'generic-interest', exp: { kind: 'confirmation', company: 'Acme Corp', title: '', at: null },
    text: `From: Talent Acquisition <careers@acmecorp.com>
Subject: Your application
Date: Thu, 29 Oct 2026 08:00:00 -0500

Dear Applicant,

Thank you for your interest in career opportunities with Acme Corp. We have received your resume and our recruiters will review your qualifications.

Unfortunately, due to the high volume of applications, we cannot respond to every candidate individually. If your background matches an open role, we will contact you.

Acme Corp Talent Acquisition` },
  { id: 'assessment', exp: { kind: 'interview', company: 'Coinbase', title: 'Software Engineer Intern', at: null },
    text: `From: HackerRank <support@hackerrankforwork.com>
Subject: Invitation to take Coinbase's coding assessment
Date: Tue, 3 Nov 2026 07:00:00 +0000

Hi Alex,

You have been invited by Coinbase to take the Software Engineer Intern coding assessment. You'll have 90 minutes to complete 3 questions. Please complete it by Nov 10, 2026.

Good luck!
HackerRank on behalf of Coinbase` },
  { id: 'rejection-plain', exp: { kind: 'rejection', company: 'Notion', title: 'Software Engineer, New Grad', at: null },
    text: `From: Notion <no-reply@ashbyhq.com>
Subject: Your application to Notion
Date: Mon, 26 Oct 2026 10:00:00 -0700

Hi Alex,

Thank you for your interest in Notion and for applying to the Software Engineer, New Grad role. After careful consideration, we've decided not to move forward with your application at this time.

Best,
Notion Recruiting` },
];
