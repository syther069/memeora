# UX Guide: Universal Principles for Interface Behavior, Feedback and Trust

**Edition:** Universal English edition, 8 September 2026. Domain-neutral guidance for any digital product: web, mobile, desktop or internal tools. Provenance and method are recorded in section 18.

**Companion:** [UI.md](UI.md) covers the visible expression of the same experience: hierarchy, layout, typography, color, imagery, components, motion and performance. The two guides are written to be used together.

## Contents

- [1. Foundations: UX versus UI, task-first thinking, contextual principles, complete-state thinking](#1-foundations-ux-versus-ui-task-first-thinking-contextual-principles-complete-state-thinking)
- [2. Laws and principles, precisely](#2-laws-and-principles-precisely)
- [3. Discovery: navigation, search, filtering and sorting](#3-discovery-navigation-search-filtering-and-sorting)
- [4. Decision support and choice architecture](#4-decision-support-and-choice-architecture)
- [5. First impressions, visual identity and perceived quality](#5-first-impressions-visual-identity-and-perceived-quality)
- [6. Understanding, confidence and trust](#6-understanding-confidence-and-trust)
- [7. Interaction feedback, errors, forms and reversibility](#7-interaction-feedback-errors-forms-and-reversibility)
- [8. Engagement and return loops without compulsion](#8-engagement-and-return-loops-without-compulsion)
- [9. Dark patterns, honest persuasion and regulatory context](#9-dark-patterns-honest-persuasion-and-regulatory-context)
- [10. Accessibility and mobile usability](#10-accessibility-and-mobile-usability)
- [11. Speed, stability and resilience](#11-speed-stability-and-resilience)
- [12. Surface archetypes: a UX reference by screen type](#12-surface-archetypes-a-ux-reference-by-screen-type)
- [13. Truthful interfaces: what a UI can and cannot claim](#13-truthful-interfaces-what-a-ui-can-and-cannot-claim)
- [14. Measurement and evaluation](#14-measurement-and-evaluation)
- [15. UX review checklist](#15-ux-review-checklist)
- [16. Evidence gaps and open questions](#16-evidence-gaps-and-open-questions)
- [17. Source and evidence register](#17-source-and-evidence-register)
- [18. Provenance and method](#18-provenance-and-method)

## About this guide

### Purpose and scope

This guide explains how a digital interface should behave and feel across discovery, decision-making, feedback, states, errors, forms, trust, accessibility, speed, resilience and evaluation. Its purpose is to help teams make important tasks understandable, manageable and recoverable, not merely to make populated screens look polished.

This is a standalone UX knowledge base. It is guidance, not an implementation plan, roadmap, delivery schedule or final visual-design decision. It describes what should be considered and reviewed. It does not claim that any feature has already been built, measured or approved.

The intended readers are designers, engineers, product people and automated builders. Each group should use the guide to inspect the complete interaction contract, including what a person can do, what the system knows, how status is communicated, what persists and how someone recovers when an expected result does not occur.

### Relationship with UI.md

UX and UI are related but not interchangeable. This guide addresses task flow, findability, decision support, system behavior, feedback, recovery and the user's broader perceptions of an interaction. UI.md addresses visual hierarchy, composition, typography, color, responsive layout, component presentation and visual states. Use both documents together. A visually clear control can make an action easier to identify, while its behavior must still explain the result and any recovery path. Conversely, sound behavior can remain difficult to use if hierarchy, labels or layout hide the available action.

### How to read and apply the guide

Start with the person's complete task rather than an isolated screen. Identify the task's entry point, action, waiting period, result and recovery path together. A populated screenshot represents only one moment. A first visit, empty collection, partial response, slow response, failed update, stale result and uncertain outcome are also parts of the experience.

Read section 1 first for the guide's operating principles. Sections 2 to 6 cover principles, discovery, decisions, first impressions and confidence. Sections 7 to 11 cover feedback, errors, forms, engagement, ethics, accessibility, speed and resilience. Sections 12 to 15 turn those principles into surface-level guidance, truth boundaries, measurement and review. Sections 16 to 18 record uncertainties, evidence and provenance.

Apply principles in context. Manageable options, visible system status, familiar controls and easy correction are useful directions, but no fixed item count, control position or delay is a universal recipe. The appropriate choice count, control placement, information density and feedback intensity depend on the task, device, consequences and information complexity.

At every important point, the interface should answer three questions:

1. What can I do?
2. What happened?
3. What can I do next?

If those answers are unclear, improve understanding before adding decoration.

Statistics and numeric thresholds in this guide are evidence context, not product targets. Read every number with its population, method, date, denominator, device, task and source type. A benchmark from one market, a laboratory reaction task, a standards threshold and a vendor case study do not establish the same kind of claim. Do not turn a historical result, minimum conformance requirement or context-specific observation into a universal optimum.

### Evidence labels

The guide distinguishes the role and strength of evidence rather than treating all citations as interchangeable:

| Label | How to read it |
|---|---|
| **Established guidance** | A durable recommendation from a standards body, public design system or established usability organization. It is authoritative within its stated scope, but it is not automatically an experimental finding. |
| **Academic finding** | A result reported by academic research. Its method, sample, task and limits remain part of the claim. |
| **Practitioner recommendation** | Advice based on professional practice, audits or implementation experience. It can be useful without being a universal law. |
| **Hypothesis** | A reasoned proposition that still requires evaluation with the intended audience and context. |
| **Historical anecdote** | A record of a particular period, event or product account. It provides context, not a current benchmark. |
| **Unverified or unclear** | A claim whose exact wording, mechanism, provenance or present applicability was not established. It must not be silently strengthened or treated as settled fact. |

The underlying research also used claim-level verdicts such as supported, qualified, unsupported as stated, contradicted or corrected, historical, illustrative or unverified, and transcript unclear. These verdicts describe how well a source supports a particular statement, while the labels above describe the type of evidence. Academic research helps explain behavior, UX guidance informs design decisions, standards define requirements or reference points, and policy sources inform honest presentation. None should be presented as proof of a different kind of outcome.

The original synthesis relied partly on indexed excerpts and abstracts. Later research examined selected original pages, document extracts, standards and practitioner guidance, but not every source was reviewed in full text. The source and evidence register preserves access context. Exact layouts, audience responses and performance must still be judged in actual use.

## 1. Foundations: UX versus UI, task-first thinking, contextual principles, complete-state thinking

### UX is broader than visible interface styling

It is useful but incomplete to describe UI as colors, buttons and layout, or UX as what happens after a control is activated. User experience also includes perceptions, behavior, nonvisual interaction and the wider product or service interaction. [62] [63]

Visual quality and usability therefore require separate review. A polished interface can create a favorable impression without enabling successful task completion, and visual praise is not evidence of task success. [1] The useful synthesis is:

**Impress with presentation. Help with discovery. Reassure with clarity. Reward progress with useful feedback. Preserve user control.**

This is an evidence-informed product philosophy, not a mathematical formula or a guaranteed organizational or commercial outcome.

### Begin with the task, not the screen

For each surface, first identify what the person is trying to accomplish. Then inspect the task from entry through action, waiting, result and recovery. The unit of design is not a single ideal screenshot. It is the person's ability to understand and complete a task across all meaningful conditions.

A builder's familiarity with routes, controls, data and expected results does not substitute for discoverability by a first-time visitor. That visitor may be distracted, unfamiliar with the subject, using a keyboard or assistive technology, or working over a slow connection. Every important action needs a recognizable label, immediate acknowledgment, a lasting and truthful result, and a valid next step. Reviewing whether an activation technically worked is insufficient. The review must also ask how the person can tell that it worked.

Teams and automated generators are especially vulnerable to happy-path bias because a populated, successful state is easy to display and judge. Broad claims that automated tools generally omit states have not been established by a primary comparative benchmark, so treat that diagnosis as a practitioner observation rather than a measured capability result. The corrective practice is still sound: review product understanding and uncertain-state handling separately from visual execution.

### Define scope and truth boundaries

Every product should state its scope, source of truth and capability boundaries explicitly. Distinguish real operations from local changes, previews, estimates, sample content and unavailable capabilities. Functional interaction should produce a meaningful state change, not merely animate a control or link disconnected surfaces.

Never let the interface imply that an operation occurred when the underlying system did not perform or confirm it. Do not present fictional activity, sample evidence, local persistence, tentative output or an unconfirmed remote request as real operational success. Explorations, prototypes, technical assumptions and discussed feature areas are not commitments or evidence that functionality exists.

A product may intentionally cover broad information or many possible objects. Breadth and decision difficulty are different. A large set can remain useful when finding, narrowing and comparison are manageable. [2], [3], [4] The relevant principle is not to make the underlying domain artificially small. It is to help people find relevant options, understand differences and retain useful context. Any exact content count or category count remains a context-specific design choice unless research establishes otherwise.

### Core takeaways

1. **Breadth and decision difficulty are separate concerns.** Large collections can be useful when discovery and narrowing remain manageable. Choice overload is conditional, not a rule that fewer choices are always better. [2], [3], [4]
2. **Evaluate beauty and usability separately.** Visual appeal may influence perception, but it does not replace evidence that people can understand and complete a task. [1]
3. **Support decisions rather than applying arbitrary persuasion.** Relevant reasons, differences, key numeric attributes and consequences should be clear.
4. **Satisfaction comes from understandable state change, not animation alone.** The result of an interaction should be visible and, where appropriate, reversible. Motion should communicate rather than disguise uncertainty. [10]
5. **Engagement should produce user value.** Retained context and easy return can be useful; compulsion is not an acceptable objective. [7], [8], [9]
6. **Trust depends on truthful information.** Do not present invented activity, unsupported evidence or simulated capability as real.
7. **Speed, accessibility and recovery are core experience qualities.** They are not finishing touches to add after a successful visual state.
8. **Choose outcomes that match the product's actual stage and capability.** Presentation quality, comprehension and task completion can be meaningful outcomes where real operational or commercial outcomes do not exist. Do not describe one as evidence of the other. [27], [28]
9. **UI and UX work together.** Color, hierarchy and layout should help people identify actions. Interaction behavior should explain status, result and recovery. Internal knowledge of the information structure is not a substitute for first-time discoverability.
10. **Begin with four states, then go further.** Loading, success, error and empty are a starting vocabulary. Also consider partial, stale, unavailable, invalid-but-being-corrected, pending, cancelled and unconfirmed outcomes.
11. **Software should absorb avoidable effort.** Do not make people repeatedly calculate values, repair preventable formatting problems or reconstruct context that the system could retain.
12. **Feedback must tell the truth.** Show ready results without artificial delay. Do not present pending work as complete, failed content as empty, stale information as fresh or an unconfirmed update as permanent success.

### Truth is a shared requirement

Loading, success, errors, caching and optimistic interaction are often taught separately, but they share one question: does the interface claim only what the system currently knows?

Artificial waiting pretends that work is occurring. An incorrect failure message pretends that the cause or outcome is known. Stale information can pretend to be current. An optimistic result can pretend to be confirmed. Their visual forms differ, but each can misrepresent operational truth. Cache behavior and temporary optimistic state illustrate why freshness, local expectation and confirmed persistence must remain distinguishable. [51], [53] This shared truth principle is a synthesis, not a quoted universal law.

Truth boundaries should be visible in language and behavior. Label estimates, previews, local changes, pending requests, stale but usable content and unknown outcomes accurately. If completion is uncertain, preserve that uncertainty and offer a safe next step rather than inventing success or failure.

### State completeness is an interaction contract

Designing four screens labeled loading, success, error and empty does not complete an interaction. Real tasks can be partially loaded, stale but usable, invalid while someone is correcting input, unavailable for a stated reason, or pending with an unknown outcome. Empty-state guidance and accessible status-message guidance support planning beyond happy-path data. [45], [41]

A screen can look complete while its interaction contract remains incomplete. A progress indicator without a failure exit, a success notice without persisted state, or an error without a recovery path leaves the task unresolved. State planning must cover:

- what triggered the state;
- what the system knows and does not know;
- what remains usable;
- what changed locally or remotely;
- whether the result persists;
- what status assistive technology receives;
- what the person can do next;
- how retry, cancellation, correction or reversal behaves.

Task-specific variants matter as much as the generic four states. Consider unavailable options, conflicting edits, expired information, partial batch results, duplicate requests, offline changes and outcomes that cannot yet be confirmed whenever the task can produce them.

### Simplicity means reducing useful effort

Screen density is not a reliable unit of simplicity. Familiar conventions, choice-reaction research, complexity allocation and progressive disclosure offer different lenses. Combining them into a rule to hide more is incorrect. Sometimes visible explanation reduces effort; sometimes fewer competing controls reduce uncertainty. [29], [31], [33], [34]

A visually sparse interface can still be cognitively expensive if it hides key attributes, active constraints, current status or the route to comparison and correction. Judge simplicity by the useful effort required to understand, decide, act and recover. Remove avoidable complexity, place unavoidable complexity where the system can handle it, and disclose advanced detail without concealing information needed for the current decision.

### Timing depends on whether a person is starting or correcting

Feedback timing is asymmetric. Marking incomplete initial input as erroneous may be premature, while retaining an old error after a corrected value is also harmful. The logic for showing a message and removing it should not be assumed to be identical. [38]

An action needs timely acknowledgment, but immediate acknowledgment does not always require a progress indicator. A local pressed state, visible selection or changed value may confirm a reversible action. A progress treatment is appropriate when work continues and the wait needs explanation. Treat acknowledgment timing and completion timing as separate design decisions. [46]

### Reversibility and consequence shape feedback

The feedback required for a low-risk, reversible change differs from the feedback required for a consequential operation with an uncertain outcome. A changed state may adequately confirm the first. The second needs explicit, durable information about what is pending, what was confirmed, what failed and what recovery is available. System-status guidance and optimistic-state semantics support this direction, but no single feedback treatment fits every level of risk. [58], [53]

Useful satisfaction can mean less uncertainty and easier recovery, not more celebration. Scale persistence, prominence and interruption to the consequence of the action. Never use animation to imply certainty that the system does not have.

### Independence belongs to the task

Architectural components can fail independently, but the person experiences one coherent task. Isolating an optional supporting region may preserve the primary task. By contrast, mutually dependent values, summaries or commitments cannot be excused as separate boxes when they disagree.

Design independence around task integrity. A local failure should remain contained when containment is truthful and useful, but dependent information must reconcile before the interface asks someone to rely on it. Consistency guidance and graceful-degradation principles support preserving usable capability without presenting contradictory state. [30], [52]

### Standards are floors, not complete comfort targets

Motor-performance research, physical target studies and accessibility standards use different methods and units. Do not combine movement models, millimeter recommendations, CSS-pixel thresholds and standards exceptions into one universal compliance rule. [35], [55], [36]

Passing one criterion does not establish whole-product usability. A control may qualify for a specific contrast exception yet remain difficult to understand. Conversely, an unattractive muted style is not automatically a standards violation. Use standards as required floors within their defined scope, then evaluate comprehension, comfort, error rate and task success with the relevant people, devices and conditions.

## 2. Laws and principles, precisely

Design laws and named effects are compact models, not automatic layout generators. Each has a scope, an evidence base and boundary conditions. A responsible application starts by identifying the task studied, then asks whether the current interface presents a comparable problem. It does not turn one finding into a universal coordinate, item count, target size or timing threshold.

### Jakob's Law: familiarity without cloning

**What it states.** Jakob's Law summarizes a practical observation: people spend most of their time using interfaces other than yours, so they bring learned expectations about how familiar controls and patterns work. Recognizable signifiers, consistent meanings and established conventions reduce unnecessary relearning. It is named after Jakob Nielsen. It is not a physical or mathematical law. [29], [30]

**Common misreading.** The principle does not require every interface to look alike, does not prescribe a fixed coordinate for a control and does not establish that a familiar pattern is always appropriate. A location that is common in a left-to-right desktop header is not automatically correct for a mobile browser, native application, right-to-left layout, different input method or different task. Familiar operation and original visual identity are compatible. [29], [30]

**Evidence status.** This is established practitioner guidance about learned expectations and consistency, not a controlled result that assigns a conversion penalty to every deviation. Claims about a universal placement, an exact delay while someone searches for a moved control or guaranteed commercial harm are not established by the cited evidence.

**Practical implication.** Preserve recognizable purposes, labels and behavior for primary navigation, search, home links, saving, selection sets and other common actions. Keep the same action consistent across surfaces. Depart from convention when task, device, accessibility, language direction or local expectations justify it, not merely to appear novel. Distinctive typography, color, composition, imagery and voice can provide originality while operation remains predictable. When directional adaptation is required, mirror flow and directional controls selectively rather than mirroring every symbol, logo, image or number. A large or scrollable menu is not inherently unusable; unclear naming, weak grouping and poor findability are the actual concerns.

### Hick-Hyman Law: response uncertainty, not a universal item limit

**What it states.** Hick's 1952 work and Hyman's 1953 work concern speeded stimulus-response selection. The relationship is commonly described as logarithmic: reaction time varies with the information or uncertainty represented by possible stimulus-response alternatives. Hick's accessible abstract describes a perceptual-motor task with up to ten alternatives. Later review material identifies qualifications involving compatibility, practice, very large sets and sequential dependence. [31] [64] [65]

**Common misreading.** Hick-Hyman does not say that every meaningful decision becomes worse whenever another item is added. Choosing among commands in a speeded response task is not equivalent to evaluating suitability, value, risk and trade-offs. The law does not prescribe six choices, a maximum collection size or a fixed number of navigation entries.

**Evidence status.** The original research is academic choice-reaction research. The detailed source review did not verify the original full methods and equations for both papers, so no exact formula should be presented here as a newly verified quotation. Applying the model to deliberative decisions is an informed design analogy whose fit must be tested, not a direct replication of the laboratory task.

**Practical implication.** Organize competing decisions instead of blindly deleting options. Give each surface one clear primary purpose; make secondary actions available but visually quieter. Group controls by decision relevance, merge duplicates that have the same meaning and preserve genuinely different choices and consequences. Give newcomers guided starting points while preserving direct search and filtering for experienced people. In comparisons, align attributes, normalize units and make meaningful differences easy to scan.

### The jam study and choice-overload evidence

**What the jam study found.** Iyengar and Lepper's 2000 field experiment compared displays of 24 and six jams. Of 242 passers-by exposed to the extensive display, 145, about 60%, stopped. Of 260 exposed to the limited display, 104, about 40%, stopped. Among those who stopped, 31 of 104 in the six-option condition, nearly 30%, purchased, compared with 4 of 145 in the 24-option condition, about 3%. These percentages are not purchase rates for all 754 observed people. The larger display attracted more attention, while the smaller display was associated with more purchasing among those who stopped in that setting. [32]

**Common misreading.** This was an assortment experiment, not Hick's experiment. It does not prove that six is universally optimal or that a larger set always reduces action. Attention capture, decision comfort and commitment are different outcomes. The paper also acknowledged possible self-selection and setting-related limitations. [32]

**What the meta-analyses add.** A 2010 meta-analysis reported 63 conditions from 50 experiments, with a total sample of 5,036. Its average choice-overload effect was virtually zero, with substantial variation between studies. This does not mean overload never occurs. [2] A 2015 meta-analysis reported 99 observations and a total sample of 7,202. Its abstract identified four reliable moderators: choice-set complexity, decision-task difficulty, preference uncertainty and decision goal. More complex sets, harder tasks, greater uncertainty and a prominent effort-minimizing goal made overload more likely. [3]

**Evidence status.** The 2010 figures come from the available abstract and register, while the later source was reviewed at abstract or landing-page level rather than as a fully verified paper. The findings support conditionality, not a universal rule in either direction. Assortment size alone cannot predict decision quality.

**Practical implication.** Preserve useful breadth while reducing comparison burden. Highlight relevant differences, offer understandable narrowing and let people revise priorities and constraints. Do not shrink a collection solely because it is large. Do not use unsupported labels such as a personalized "best" designation when the system lacks evidence for that authority. Evaluate confidence, regret, choice deferral and switching separately rather than treating any one measure as a complete account of overload. [3]

### Tesler's Law: allocate irreducible complexity responsibly

**What it states.** Tesler's own account, associated with wording from around 1984, proposes that applications contain some irreducible complexity and asks whether the person, application developer or platform developer should handle it. [33]

**Common misreading.** It is not a mathematical conservation law stating that no complexity can ever be removed. Unnecessary complexity can be eliminated and requirements can change. The principle concerns the allocation of complexity that remains. A familiar story about a million people each wasting a minute while an engineer could remove the burden is useful as an aggregate-cost illustration, but its exact edition, page and verbatim provenance were not resolved. Historical sole credit for inventing cut and paste is also too strong: museum records associate Larry Tesler and Tim Mott with an early influential implementation. [66] [67]

**Evidence status.** This is a practitioner theorem supported by Tesler's primary page and historically qualified archival metadata, not an experimental law. [33]

**Practical implication.** Let software perform avoidable arithmetic, formatting, compatibility preparation, state reconciliation and restoration. Tolerate reasonable input formats and reuse known preferences in a reviewable, editable form. Do not transfer internal implementation work to people through repeated reconstruction. At the same time, do not hide permissions, uncertainty, material restrictions, consent or decision consequences in the name of simplicity. The goal is fewer pointless steps, not fewer informed choices.

### Fitts's Law: target acquisition in context

**What it states.** Fitts's 1954 experiments relate aimed movement time to movement amplitude and acceptable target width or tolerance. Target size, distance and the speed-accuracy trade-off are central. The original tasks used physical stylus, disc and pin apparatus, not modern touch navigation. [35]

**Common misreading.** Fitts's Law does not prove that a particular navigation control belongs at the bottom of every screen, that a visually large icon necessarily has a large hit region or that one target dimension works for every person and device.

**Evidence status.** A 2006 study tested thumb input with 20 right-handed participants using a small handheld device while stationary and standing. Larger targets generally improved performance, but the model did not explain every serial-entry result. The older device, one-handed grip and participant sample limit generalization to current devices, left-handed use, movement and other grips. [55]

**Practical implication.** Design and inspect the actual interactive region, not only the visible symbol. Provide comfortable target size and spacing, make associated labels interactive where appropriate and separate destructive controls from frequent actions. Account for occlusion, accidental activation, layout shifts, movement, orientation, input device, hand and grip. Approximately 44 by 44 CSS pixels or comfortably larger can be a usability starting point for primary mobile controls, but it is not a universal Fitts-derived threshold or an automatic accessibility claim. [35], [36]

### Progressive disclosure: secondary detail later, essential understanding now

**What it states.** Progressive disclosure places frequently needed controls and decision-critical information in the primary layer, while deferring advanced or rarely used material to a clearly labeled secondary layer. The route to more information must be obvious and labels must set expectations. [34]

**Common misreading.** It is not a synonym for hiding features, collapsing every long surface or splitting every form into many pages. A person must be able to discover that a capability exists. Selected state, required choices, important limits, consequential totals and other essential facts must remain visible. Staged disclosure, which divides work into linear steps, is a separate pattern. Too many stages create navigation cost. [34]

**Evidence status.** This is established practitioner guidance rather than a universal experiment defining the ideal number of layers or steps. A promotional claim that multistep forms can produce gains above 300% comes from varied vendor cases and does not isolate pagination as a universal cause. [68]

**Practical implication.** Use explicit labels for secondary details, preserve active selections when their panels collapse and keep frequent actions available without a tutorial, hover dependency or deeply nested menu. Use staged disclosure only when the task has meaningful stages or dependencies. Show the current step and meaningful progress, preserve answers, and provide back and edit routes without forcing an unnecessary funnel.

### Labor illusion: visible genuine effort can affect perceived value

**What it states.** Buell and Norton's 2011 research on operational transparency used simulated travel and matching contexts. Across five experiments, making performed work visible could increase perceived effort and value, sometimes even relative to a faster opaque result. The work examined outcomes including perceived value, satisfaction, reciprocity and repurchase intention. [50]

**Common misreading.** The finding does not show that delay itself creates trust, that every process should display theatrical checking or that a slower interface is preferable. Poor results and suspected manipulation can undermine the effect. The outcomes should not be flattened into the universal claim that visible work increases trust.

**Evidence status.** This is peer-reviewed experimental research in bounded contexts, not a general license to manufacture waiting in any interface. [50]

**Practical implication.** When real work takes noticeable time, explain genuine stages or progress in understandable terms. Do not fabricate progress, invent work, hold back ready results or add artificial delay to make a system appear diligent. Operational transparency complements functional quality; it does not replace it.

### The aesthetic-usability effect

**What it states.** Attractive interfaces can lead people to tolerate minor usability problems and can mask problems during evaluation. [1]

**Common misreading.** Visual appeal is not proof of task success, accessibility, comprehension or a numerical performance gain. Positive answers to "Does it look impressive?" and "Can people complete the relevant task easily?" are separate findings.

**Evidence status.** The source is established UX guidance. It supports a perceptual effect and an evaluation caution, not a guaranteed behavioral or commercial uplift. [1]

**Practical implication.** Evaluate visual quality and task usability separately. Use coherent typography, color, imagery and hierarchy, but do not treat tiny text, low contrast, inaccessible controls or excessive empty space as signs of quality. Test findability, comparison, action and recovery even when reviewers like the appearance.

### Response-time limits and honest waiting

**What the principle states.** Historical usability guidance distinguishes roughly 0.1 second for a response that feels immediate, 1 second for preserving uninterrupted flow and 10 seconds as a point where sustaining attention becomes difficult. These are response-experience bands, not guaranteed psychological switches. [11]

**Common misreading.** Five or ten seconds is not a biological threshold at which every person has the same reaction. Static status text has not been shown here to add exactly one second of tolerance. A loading indicator must not delay a ready result, hide a known failure or represent invented progress. Claims that a spinner becomes unusable at one exact duration are over-precise.

**Evidence status.** The 0.1, 1 and 10 second distinctions are foundational practitioner heuristics from 1993, not universal modern pass or fail criteria. Guidance that roughly 2 to 10 second work can use looped feedback and longer work benefits from percentage completion is also practitioner guidance, sensitive to task and uncertainty. [46]

**Practical implication.** Acknowledge input immediately, show real results as soon as they are ready and choose waiting feedback according to actual duration and progress knowledge. Use determinate progress only when progress can be measured. Let changing messages represent real stages. Preserve cancellation or recovery where appropriate. Artificial delay is not a substitute for clarity.

### Autonomy, competence and intrinsic motivation

**What the principle states.** Ryan and Deci's self-determination research connects support for autonomy and competence with intrinsic motivation. Intrinsic interest in the activity remains an important qualification. [7]

**Common misreading.** This is not direct evidence that adding controls, choices or motivational language increases purchases, retention, revenue or repeat use. More options do not automatically create autonomy, especially when consequences are obscure.

**Evidence status.** The source is academic motivation research, not a direct experiment on interface conversion. [7]

**Practical implication.** Explain what an action changed, keep preferences editable, provide reversibility and preserve meaningful control. Forced enrollment, guilt-inducing language and interventions that are difficult to dismiss can weaken autonomy. Support competence through understandable consequences rather than praise or pressure alone.

### Habit formation and voluntary return cues

**What the principle states.** Lally and colleagues studied automaticity through repeated everyday behavior in response to cues. The indexed method describes 101 initial attendees, 96 participants and a 12-week context. [8]

**Common misreading.** The study does not establish a fixed 21-day rule, a universal timeline or a compulsory daily-use loop. It did not test spending or prove that any reminder produces a beneficial habit.

**Evidence status.** This is academic habit research whose full methods and results were not reviewed in the source guide. Its everyday-routine context limits transfer to other tasks. [8]

**Practical implication.** Help people voluntarily resume meaningful ongoing work by preserving context, history and saved choices. Do not convert habit research into pressure for unnecessary daily activity.

### Gamification: element-specific and context-specific

**What the principle states.** Sailer and colleagues reported different psychological effects for different game-design elements. In the available excerpt, badges, leaderboards and performance graphs were associated with competence-related outcomes, while avatars, stories and teammates were associated with social relatedness. Perceived decision freedom did not change as intended. [9]

**Common misreading.** "Gamification works" is not a supported general conclusion. The evidence does not establish transferable satisfaction, engagement or commercial uplift for any arbitrary interface.

**Evidence status.** This is an academic experiment about specific elements and outcomes. It does not support a universal reward schedule or a general causal claim about all products. [9]

**Practical implication.** Start with useful feedback, understandable progress and meaningful comparison. Add a game-like element only when its intended psychological function matches the task and can be evaluated. Avoid gambling-like reward mechanics when ordinary feedback can support the task without compulsion.

### Purposeful motion

**What the principle states.** Brief, subtle and unobtrusive motion can communicate feedback, state change, navigation and signifiers. [10]

**Common misreading.** Motion is not inherently delightful, and no duration in the cited material is scientifically optimal for every interface. Animation must not be required to understand the result or delay the next action.

**Evidence status.** This is established practitioner guidance, not a universal experiment assigning one duration to all transitions. [10]

**Practical implication.** Use motion to explain what changed, preserve core information and operation without it, and respect reduced-motion preferences. Avoid continuous attention capture and decorative movement that competes with the task.

### Numbers and historical claims: quick reference

| Claim | Research verdict | Safe interpretation |
|---|---|---|
| 86% liked progress feedback even when it was inaccurate | Qualified historical retelling | A university retrospective reports 48 participants and says 86% liked the bars. Tolerance of inaccuracy is a separate recollection, not a demonstrated 86% rate for inaccurate bars. [69] |
| Progress bars first appeared in the late 1980s | Chronology corrected | A relevant publication dates to 1985. It does not establish invention or rule out prior art. [70] |
| A major desktop system used only a static hourglass for 20 years | Unsupported at that precision | The history of a default wait-cursor motif does not establish the universal absence of animated variants. [71] |
| A spinning multicolor wait cursor was invented or introduced in 2001 | Chronology unverified | The exact version, introduction date and earlier antecedents were not resolved. [72] |
| Skeleton screens were invented in 2013 | Too strong | The original 2013 practitioner article describes, names and popularizes the technique. It does not prove invention. [47] |
| Static loading text adds one second of tolerance | Unsupported | No matching measured extension was found. Informative status can still reduce uncertainty. [46] |
| A psychological switch flips at exactly five or ten seconds | Over-precise | Response-time bands are heuristic guidance, not guaranteed reaction thresholds. [11] |
| Six choices are universally best because of the jam study | Incorrect generalization | This was one contextual retail study with different attraction and purchase denominators, not a universal six-item optimum. [32] |
| Multistep forms increase conversion by more than 300% | Not a general result | Vendor cases vary and do not isolate pagination as a universal cause. [68] |
| Recommendations account for 80% of viewing | Historical, denominator corrected | A company-authored 2015 paper reported that recommendation systems influenced about 80% of hours streamed, not 80% of people, titles or interactions, and not a current or homepage-only measure. [73] |
| Tesler alone invented cut and paste | Attribution corrected | Museum records credit Tesler and Mott and describe an early influential implementation, not an uncontested sole invention. [66] |
| Every mobile selection-set control belongs at the bottom | Not a law | Placement depends on platform, grip, task and local expectations. [60] [55] |
| 44 pixels is the universal AA minimum target size | Incorrect | WCAG 2.2 distinguishes a 24 CSS pixel AA criterion from a 44 CSS pixel AAA criterion, and both have exceptions. [36] |

## 3. Discovery: navigation, search, filtering and sorting

Discovery is a connected system. Search, category or structural navigation, list-item information, filtering, sorting and result-state management must work together. Improving one route does not compensate for failure in another. Search research connects poor finding with repeated query refinement, wasted effort and abandonment, while navigation remains a separate substantive route. [5], [6] Research on lists treats item presentation, filtering and sorting as one experience rather than independent features. [4]

The source-specific evidence has boundaries. An indexed search excerpt described roughly half of test participants preferring search and half navigation, referenced eight query types and reported issues on 56% of assessed sites. The complete eight-type taxonomy was not retrieved, so those figures are not universal audience shares or benchmarks. A list-and-filter excerpt reported abandonment ranges of 67% to 90% with mediocre usability and 17% to 33% with a somewhat optimized toolset, plus an "up to four-fold" interpretation. Its full method and comparability were not verified, so the figures are contextual observations, not forecasts or guaranteed causal effects. [4], [5]

### Match entry routes to starting intent

People begin with different levels of knowledge. Preserve multiple routes and let them converge on coherent result state.

| Starting situation | Useful entry route | UX implication |
|---|---|---|
| A specific item, record or model is known | Search | Do not force unnecessary browsing before direct finding |
| A class is known but the exact item is not | Categories and filters | Support narrowing through relevant attributes |
| A need or constraint is known but the item is uncertain | Guided discovery | Use editable questions or preferences to create an understandable shortlist |
| Something was previously viewed or saved | Saved items, history or recent activity | Do not make the person reconstruct useful context from the beginning |

This segmentation is a practical design interpretation, not the result of a universal segmentation study.

### Navigation structure

Primary destinations and current location should be recognizable. A home route, search, category structure and persistent collections should communicate their purpose without requiring people to decode unusual metaphors. Keep the label, symbol and behavior for one action consistent across surfaces. If "save" can mean different destinations, name those destinations rather than relying on the same ambiguous control.

A familiar left-to-right desktop convention can be a reasonable starting point, but no single coordinate is mandatory. On smaller screens, choose a reachable header, toolbar, contextual control or bottom navigation according to platform and task. Do not interchange mobile-web and native-application conventions blindly. Browser navigation, address controls, keyboard behavior and safe areas affect available space and expected operation.

Keep category grouping manageable without making labels so broad that every group must be opened and guessed. Large menus can use clear groups, readable labels and search. Scrolling alone is not the problem; failure to locate a relevant option is. Hidden primary navigation can impair discoverability, so deferral is appropriate for advanced complexity, not for making essential routes invisible. [74]

Curated groups need a meaningful, attribute-based rationale and a route to broader results. Curation should help a person understand why items appear together, not imply personalization or quality that the system has not established.

### Search behavior and query support

Search suggestions should correspond to actual available content and supported matching behavior. Synonyms for categories, types or names can improve approachability. Explicitly supported expressions for numeric limits, dates or other constraints may also help, but illustrating one supported expression must not imply unrestricted natural-language understanding.

Do not describe deterministic matching as an intelligent assistant unless the capability supports that claim. A suggestion selection and a submitted query should lead to consistent destinations and results. Result counts must reflect the active query and filters.

Query handling should distinguish exact identifiers, names, categories, attributes, constraints and ambiguous exploratory terms according to the content model. The cited source indicates that different query types matter, but the complete eight-type taxonomy was not retrieved; do not claim complete coverage on that basis. [5] Document supported forms and evaluate them against authentic query logs or research when available.

When a query is unsupported, preserve it and explain the no-result state. Keep search editable and offer truthful alternatives. A supported spelling correction should appear as a suggestion, not as a silent replacement of intent. Never invent matching records to avoid an empty state.

### Filtering and sorting as shared state

Filters should reflect attributes that matter within the current content type. Forcing one generic list across every type can hide meaningful differences. Group controls by decision relevance rather than presenting a flat wall of unrelated choices.

Active filters must remain visible and individually removable. A clear-all action must communicate its scope. Combined filters, sorting, pagination or incremental loading, result counts and visible controls must all represent the same state. If that state is addressable, the URL and browser back and forward behavior should agree with it.

Sorting must have a defined, understandable basis. If a rank depends on several signals, avoid labels that imply an objective "best" result unless the basis supports that authority. Preserve stable, comparable attributes needed to understand the order. Filters narrow eligibility; sorting changes sequence. The interface should not blur these operations.

After opening a detail view and returning, restore the useful discovery context: query, filters, sort, page or loaded range, and position where feasible. Restoration reduces avoidable reconstruction without hiding any changed or stale data.

These are practical UX recommendations, not empirically established exact layouts.

### Comparable item information

A card or list item should not duplicate every detail. Its job is to support identification, useful comparison and a sensible next action. Present a readable hierarchy containing identity, the key numeric or categorical attribute when relevant, distinguishing attributes for the current content type and availability or status.

Use the same attribute definitions, labels, units and display order across comparable items. Missing values should be distinguishable from zero, not applicable and unknown. Consistency allows scanning and prevents the presentation layer from manufacturing differences.

Do not fill every item with labels, promotional messages and competing actions. Select information according to decision relevance. That selection is a design hypothesis, and the optimal density for a given audience and task must be evaluated rather than assumed.

### Breadth, loading and result integrity

Demonstrating a large collection does not require rendering every item simultaneously. Responsive pagination, virtualization or incremental loading can preserve breadth while controlling loading and rendering cost. State the total or available result count clearly when it is known.

Breadth must be authentic. Repeating the same identity and media under different identifiers does not demonstrate meaningful variety. Items and attributes should remain coherent and stable enough for search, comparison and state restoration.

If old results remain visible while a new search or filter request is pending, clearly distinguish the pending query from the currently displayed result set. Never attach the new count to old results. Prevent a slower earlier request from replacing a later result without explanation.

Loading behavior must preserve the person's ability to understand whether results are current, pending, stale, partial or failed. Do not clear useful content merely to display a spinner if the previous result can remain safely visible with honest status. Do not claim that a pending result is ready.

### No results and relaxed results

A zero-result state should identify whether the active query, filters or both produced no matches. Preserve entered values and active selections so the person can edit rather than restart. Offer direct ways to remove a filter, clear an appropriate scope or revise the query.

Relaxed results must be explicitly labeled. Explain which constraint was relaxed and keep the original request visible. Alternatives should be based on authentic content and supported matching, not fabricated relevance. When no safe relaxation exists, say so and provide a useful route back to broader discovery.

No data, no search matches, filtered-to-zero and failed loading are different states. Do not use one generic empty message for all of them.

## 4. Decision support and choice architecture

Choice architecture should help people understand real alternatives without taking control away from them. The objective is not the smallest possible number of choices. It is an informed, manageable decision in which differences, consequences, uncertainty and routes to revision remain clear.

### Treat overload as conditional

The 2010 and 2015 meta-analyses reject a simple rule that more choice is always worse. The first found a virtually zero average effect with substantial variation across 63 conditions from 50 experiments and 5,036 participants. The second reported 99 observations and 7,202 participants, with overload moderated by choice-set complexity, decision-task difficulty, preference uncertainty and decision goal. [2], [3]

Therefore:

- Do not shrink a collection automatically because it is large.
- Reduce avoidable complexity within the set through grouping, filtering, aligned attributes and readable distinctions.
- Offer a relevant shortlist when its basis can be explained, while retaining a route to broader results.
- Let people revise priorities, constraints and preferences.
- Justify comparative claims with actual attributes.
- Do not present an unsupported "best for you" or equivalent label that implies evidence or authority the system does not have.

Attention, selection, commitment and satisfaction are distinct outcomes. The jam study showed that a larger display attracted more people while the smaller display was associated with more purchases among those who stopped. [32] A design that increases initial attention can still make a later decision harder, and a design that reduces visible breadth can conceal useful alternatives.

### Support different levels of expertise and certainty

People with a known target benefit from direct search and filters. People with uncertain preferences may benefit from editable guided questions, understandable categories and explanations of important differences. Provide both rather than forcing everyone through one funnel.

Ask only for information that changes the result or next step. Explain the consequence of a preference or filter so the person can build competence. Preserve answers and allow backtracking. A recommendation should disclose enough rationale to be evaluated and should not silently convert a tentative preference into a hard constraint.

Comparison support is especially valuable when options are numerous but differences are difficult to inspect. Align the same attributes in rows or columns, normalize units and formats, highlight real differences and distinguish shared values from missing information. Keep identity visible during long comparisons. A comparison tool should reduce transcription and memory work, not hide inconvenient trade-offs.

### Defaults, preselection and user control

Defaults can reduce repeated work when they are sensible, visible and editable. They should represent a defensible starting state, not silently decide material preferences. Explain a default when its consequence is not obvious.

Do not silently preselect paid additions, consent, disclosure-sensitive choices or other options that advantage the system at the person's expense. That practice is not justified by Hick-Hyman, choice-overload findings or Tesler's Law. A default should remain easy to review and change, and changing it should update consequences consistently.

Reusing known preferences can reduce avoidable effort, but the reused state must be reviewable and current. Never allow convenience to obscure uncertainty, availability, restrictions, privacy choices or security decisions.

### Progressive disclosure by surface

Decision-critical information belongs in the primary layer. Advanced, detailed or less frequently used material can move to an explicit secondary layer. [34]

| Surface | Keep upfront | May move to a secondary layer |
|---|---|---|
| Card or list item | Identity, key numeric or categorical attribute, important distinguishing attributes and status | Full description and detailed specifications |
| Detail view | Selected option, availability or status, key value, primary action and relevant time or context commitment | Expanded technical tables or long secondary instructions |
| Filters | Relevant common filters and all active selections | Less-used type-specific attributes under a clearly labeled control |
| Comparison | Key differences, item identity and aligned values | Full shared specifications under an explicit expand control |
| Conditional offer or rule | Eligibility essentials and the effect on the current outcome | Longer terms, without hiding exclusions that change eligibility |

Selected state must remain visible when a panel collapses. Do not hide a required option, important limitation, consequential total, status or eligibility condition to make the layout appear cleaner. Frequent actions should not depend on a tutorial, hover or deeply nested menu.

Use staged disclosure when distinct stages or dependencies justify it. Do not split a short interaction into pages merely to claim simplicity. For a staged flow, show the current step and meaningful progress, preserve answers and provide back and edit routes. The promotional claim that multistep forms raise conversion by more than 300% is not a general controlled finding; varied cases do not isolate pagination as the cause. [68]

### Allocate complexity without removing informed choice

The system should handle calculations, format normalization, compatibility checks, state restoration and coordination that would otherwise create repetitive work. [33] It should keep quantities, options, conditional adjustments and totals consistent; prepare comparable attributes and readable units; restore useful discovery state; and tolerate reasonable input formats.

Moving burden responsibly does not mean suppressing expert control or hiding consequences. Keep permissions, consent, material constraints, uncertainty and security decisions visible at the point where they matter. A simpler surface that causes an uninformed choice has moved complexity into later confusion, error or regret rather than removing it.

### Design for confidence, not only action

Choice quality cannot be inferred from clicks or completion alone. The 2015 meta-analysis discusses satisfaction or confidence, regret, choice deferral and switching likelihood as measures used in prior overload research, while warning against treating unlike measures as interchangeable. [3]

Decision support should therefore make it possible to assess:

- whether the person understands the available alternatives;
- whether important differences and missing information are visible;
- whether the person can explain why the current choice fits their stated priorities;
- whether uncertainty is acknowledged rather than hidden;
- whether changing or deferring the choice remains possible;
- whether later switching reflects new information, an editable preference or earlier confusion.

Deferral is not automatically failure. It may indicate excessive burden, unresolved uncertainty, missing information or a legitimate need for more time. Regret is also distinct from reversal caused by changed circumstances. Measurement should preserve these distinctions.

### Preserve autonomy and reversibility

Clear consequences can support competence, while editable preferences and reversibility can support autonomy. [7] Forced enrollment, guilt-inducing language and interventions that are difficult to dismiss weaken control. Do not use urgency, authority or personalization claims that the system cannot substantiate.

Allow people to remove an item, undo a reversible action, revise an option, clear or restore filters and navigate back without losing unrelated work. Where an action is irreversible or materially consequential, make that consequence clear before commitment. Decision support succeeds when people can make and revise informed choices, not when the interface merely produces the fastest possible commitment.

## 5. First impressions, visual identity and perceived quality

### Evaluate appearance and usability separately

The aesthetic-usability effect can make an attractive interface seem easier to use. People may tolerate minor usability problems in an attractive interface, and appearance can mask problems while they are evaluating it. [1] This effect is a reason to separate two questions:

- Does the interface make a strong and appropriate first impression?
- Can people easily find, compare, understand and save what is relevant to their task?

A positive answer to the first question is not evidence of a positive answer to the second. Visual refinement can support confidence and willingness to explore, but it cannot compensate for missing information, unclear actions, inaccessible controls or failed tasks. Evaluation should therefore include both perceived quality and observed task performance.

Visual complexity and prototypicality also need to be balanced rather than maximized. A surface should be recognizable enough for people to infer how familiar controls and structures work, while remaining distinctive enough to establish an original identity. The exact balance depends on audience, context and task, so it is a hypothesis to test rather than a universal visual formula. Familiar interaction conventions need not produce a derivative brand, and visual novelty should not require people to relearn basic behavior.

### A coherent and original identity

An original palette, coherent typography and consistent imagery can make a product identifiable. Originality should come from the system as a whole, not from arbitrary changes to familiar control behavior. The detailed visual treatment belongs in UI.md sections 2, 4 and 5.

Perceived quality also depends on hierarchy and consistency:

- Primary and secondary actions should be distinguishable.
- Core content and decision-relevant information should not be buried beneath competing banners or promotional material.
- Cards, chips, drawers, dialogs, empty states and unavailable or capability-limited controls should appear to belong to one system.
- A polished or premium appearance does not justify tiny text, low contrast, inaccessible controls or unnecessary empty space.
- Density should support reading and comparison. The right balance is audience-specific and must be treated as a hypothesis.

Research does not finalize an exact font pairing, color palette, spacing scale, prominent-content size, number of items per row or button color. Those choices require a coherent visual direction and testing in context, not unsupported claims that one configuration is universally optimal. UI.md sections 2, 4 and 5 cover the visual system, while UI.md section 17 covers motion and interaction polish.

### Motion should explain change

Brief, subtle and unobtrusive animation can support feedback, state changes, navigation and signifiers. [10] Motion should communicate **what changed**, not continuously capture attention.

- Animation should not delay the next action.
- Information and interaction results should remain understandable without motion.
- Core functionality should remain available when a person prefers reduced motion.
- An arbitrary duration should not be described as scientifically optimal.

Motion can improve perceived responsiveness when it promptly acknowledges input or connects two states, but it must reflect real behavior. Decorative movement cannot repair slow processing, conceal an unfinished action or substitute for a meaningful status. Detailed motion specifications belong in UI.md section 17.

### Perceived responsiveness

Historical Nielsen guidance distinguishes approximately 0.1 second for an immediate reaction, 1 second for maintaining uninterrupted flow and 10 seconds as a point at which attention becomes a concern. [11] These are foundational response-time guidelines, not universal pass or fail limits for current devices, every person or every interaction.

The practical principle is immediate acknowledgment followed by an understandable waiting state when work continues. Do not add artificial delay merely to display animation or make an operation seem substantial. The interface should distinguish input acknowledgment from completion so that people do not mistake a pressed state for a finished result.

### Control states as a quality signal

A control's visual treatment, accessible meaning and actual behavior must agree. The same state vocabulary applies not only to buttons, but also to chips, option selectors, quantity or value controls and expandable sections. [43], [44]

| State | What the person should understand | Required behavior |
|---|---|---|
| Default | The control is actionable and its purpose is clear | Use a recognizable label and appropriate hierarchy. |
| Hover | A pointer is over the action | Add subtle emphasis, but keep the action available without hover. |
| Focus | This is the keyboard's current target | Show a visible focus indicator and do not activate automatically. |
| Pressed or active | The interface received the input | Give a brief response while pressing; color or motion is optional. |
| Loading or pending | Real work initiated by this action is incomplete | Keep dimensions stable where practical, show activity with a meaningful label and handle duplicate intent. |
| Disabled or unavailable | The action is not currently possible, with an understandable reason | Explain the relevant limit, missing requirement or unavailable option nearby. |
| Selected or toggled | A persistent choice is on | Show the saved item, selected filter or other lasting choice, rather than only a press animation. |
| Expanded or collapsed | Related content is open or closed | Make the visible state and the control's programmatic expanded state agree. |

States can coexist. A selected control can also be focused. Focus is not activation, a momentary press is not a permanent selection, and every press does not begin asynchronous work. A local synchronous save or filter change does not need a forced spinner cycle.

Use native links for navigation and buttons for actions. A toggle's programmatic state, an expandable control's state and its visible label must match actual behavior. A loading state must not remove the accessible action name, because an icon or spinner alone does not explain the result. Hover support depends on input capability, not on a broad device category. These behavioral requirements are developed further in UX.md section 7 and UI.md section 16.

Consistency across these states contributes directly to perceived quality. A surface that is visually polished in its default state but unstable, ambiguous or inaccessible during interaction is not a complete high-quality interface.

## 6. Understanding, confidence and trust

### Questions an item, record or offer must answer

A detail view should help a person answer the questions that determine whether and how to proceed:

1. **What is it?** State a clear identity and category, supported by coherent imagery or other identifying media.
2. **Does it fit my need?** Provide the relevant specifications, dimensions, requirements, intended use or compatibility information.
3. **What changes with this option?** Update cost, availability and every applicable attribute when the selected option changes.
4. **What does it cost or require?** Explain the total monetary cost where relevant, as well as nonmonetary commitments, prerequisites or a meaningful breakdown.
5. **What happens next, and when?** Explain the next step, expected timing and any delivery, processing or return terms that apply.
6. **What if it is wrong?** Make correction, cancellation, return, support or other recovery paths understandable before commitment where they are available.

This is a practical synthesis for information design, not a universally tested six-question formula. The questions should be adapted to the entity and task. They should not be used as a reason to add irrelevant fields or repeat information.

If a choice is required before an action, state that requirement directly. An unavailable option may remain visible so that people can understand the available range, but its unavailable status and the blocked action must be unambiguous. When an option changes, its cost, image label, availability and dependent text should update together. Do not display an old value as though it were the result of the new selection.

### Imagery, context and scale

Baymard recommends in-scale imagery to support product understanding. The available excerpt does not treat real contextual photography and a computer-generated scale reference as equivalent; generated scale cues can be supplementary. [12] The broader principle is to supply the visual context people need to judge identity, size, fit or use.

- Images should be coherent with the item's category and displayed description.
- Relevant contextual or additional imagery can be particularly useful for prominent items.
- Reuse of curated images may be an acceptable production trade-off, but a large collection must not be presented as though every record has a unique media set when it does not.
- An approximate image must not be represented as an exact depiction of the selected option.

Where imagery cannot establish scale reliably, provide dimensions, units or other explicit scale cues. Where no accurate image exists, say so rather than presenting a misleading substitute. Visual execution for imagery belongs in UI.md sections 7 and 9.

### Time and date commitments

Baymard recommends a clear arrival date over ambiguous shipping-speed arithmetic, so that a person does not have to combine dispatch delay and transit time mentally. [13] The principle applies to any time commitment: communicate the date or time the person actually needs, not only the internal stages from which it must be calculated.

An estimate must be labeled as an estimate, and sample or illustrative timing must be identified as such. Fixed dates should not be allowed to become stale or impossible. A displayed date is not evidence that the organization has the operational ability to meet it. If timing is unknown, state that it is unknown rather than presenting invented precision.

### Ratings, reviews and social proof

A meta-analysis of electronic word of mouth examined differences among platforms, products and metrics. The available excerpt reports **1,532 effect sizes, 96 studies, 40 platforms and 26 product categories**. It does not establish a fixed ratings-to-outcome multiplier for a particular interface. [14] Social proof can inform a decision, but its meaning depends on provenance, measurement and context.

- Sample ratings or reviews must be clearly labeled as samples.
- Do not use a verified-transaction or verified-use label without evidence of the underlying event.
- Do not fabricate real-customer photographs, exact adoption or sales counts, or live-activity counters as trust signals.
- Review totals, rating filters and item displays should be internally consistent.
- Sample social proof must not create the impression of a real endorsement.
- Recommendations should state reasons that the available data actually supports, rather than claiming hidden personalization or certainty.

Fake reviews and testimonials are also a regulatory concern. The United States Federal Trade Commission announced a final rule concerning fake reviews and testimonials, including prohibited sale and purchase practices, on **14 August 2024**. [15] This is an example of a jurisdiction-specific rule, not a universal legal conclusion or a substitute for checking which requirements apply.

When reviews or recommendations are unavailable, available imagery and specifications can still be useful. However, if the item's identity, selected option or key cost itself is unresolved, the interface should not invite confident commitment. Missing evidence should remain visibly missing.

### Trust is consistency plus honest limits

Trust grows when related surfaces tell the same truth. A displayed cost, selected option, pending-selection line and summary total must not represent conflicting values. Availability labels and behavior must agree. Third parties, policies and sample content should be accurately identified.

Visual trust marks do not establish operational capability. A well-designed interface cannot prove ownership of resources, fulfillment quality, support capacity, security, refunds or any other real-world ability merely by displaying badges or polished states. Claims about these capabilities require evidence outside the visual treatment.

Consistency itself is a trust signal because people can trace cause and effect across the interface. Changing an option should update all dependent information. Adding, editing or removing a selection should produce the same result in the originating surface and its summary. A stated limit should be enforced consistently rather than appearing only when convenient.

Honesty about missing information is preferable to false completeness. Identify unknown, estimated, sample, unavailable or not-applicable information in language that distinguishes these conditions. Do not silently substitute fabricated values, and do not allow a blank state to imply that a real check returned no result when no check occurred. See UX.md section 13 for the broader boundary between interface claims and actual capabilities.

## 7. Interaction feedback, errors, forms and reversibility

### Central hypothesis

**Useful satisfaction = understandable action + visible result + retained control.**

This is a design summary, not a measured equation. Motion can communicate a result, but it cannot substitute for an actual state change. [10] Satisfaction is useful only when the interface makes the action intelligible, shows what really happened, and leaves the person with an appropriate way to continue, correct, retry or reverse.

### Interaction-state reference

The following table is a UX reference for common interaction types, not a report of observed behavior in any particular product.

| Interaction | Meaningful result | Failure to avoid |
|---|---|---|
| Save or unsave an item | The saved state and destination list reflect the actual selection | An icon animates, but the item is not saved |
| Add an item to a set | The correct option, quantity, entry and count update | An acknowledgment appears, but the set remains unchanged |
| Edit a quantity or value | The valid value and every dependent calculation update consistently | A displayed total and count disagree |
| Remove and undo | The exact previous item, option and quantity are restored | A reassuring message appears, but the data is not restored |
| Move an item to another list or state | The destination is clear and the state remains consistent | The item disappears without explanation |
| Choose an option | Availability, relevant numeric attributes and other dependent details match the choice | An unavailable option appears actionable |
| Filter and sort | Visible criteria, result count and displayed results agree | The count is stale or filters reset silently |
| Add an item to a comparison | A compatible selection is accepted, or incompatibility is explained | Incompatible entities produce meaningless comparison rows |
| Apply an input rule or conditional adjustment | Eligibility and preview calculations are understandable | The interface invents success or applies an unexplained adjustment |
| Navigate back | Useful task and browsing context is preserved | Each detail visit forces the person to restart discovery |
| Reset or clear | Confirmation and consequences are clear | Saved choices are deleted accidentally |

Across these interactions, the visible response and the underlying state must agree. A failed action must not look successful. Updated content, errors, selected options and restrictions should remain visible in the relevant page state rather than existing only in temporary decoration. Real state must never be concealed behind a fabricated success message.

### Complete state coverage

Start with loading, success, error and empty, then identify variants specific to the actual task. Not every section must support every state. Every state that can occur, however, needs honest behavior. [41], [45] The familiar four-state checklist is a starting point, not proof of completeness. Initial, pending, partial, stale, restricted and unconfirmed states may require different information and recovery.

| Situation | What the person needs to know | Useful response |
|---|---|---|
| Initial loading | Content is arriving, and the expected structure is understandable | A stable structural skeleton when the layout is known |
| Action pending | Which action is not yet complete | Local activity near the affected control or content |
| Ready / success | What result actually occurred | The changed entry, selected option, updated total or saved state |
| First-use empty | What the section is for and how to begin | A concise explanation and a relevant route to start |
| No matches | The current query or filters produced no match | Retain the query and active filters, then offer ways to edit or remove criteria |
| Cleared / completed | The intended clearing, removal or completion occurred | Confirm the empty or completed state, with an optional next route but no pressure to create more work |
| Error | What did not complete and how to recover | A persistent, scoped explanation with a retry or edit action |
| Partial | Which content is ready and which is unavailable | Keep meaningful content usable and give the failed region its own status and retry when dependencies permit |
| Stale / refreshing | The visible content is a previous snapshot | Preserve existing results, indicate scoped refresh activity and disclose consequential uncertainty |
| Unavailable / restricted | What valid limitation applies | Explain why the capability or option is unavailable and expose accessible alternatives when they exist |
| Unconfirmed outcome | The result is not yet certain | State that confirmation was not possible, preserve context and reconcile before claiming success |

Do not collapse missing data, no search match, first use, completed work and failed loading into one generic empty screen. Empty can mean not started, no match, no permission, no data or successfully finished. The interface should represent the actual reason. A no-match state must not be labeled as a system failure, and suggestions to change a query or criterion should be derived from real supported behavior rather than silently rewriting intent. Not every decorative or intentionally absent region needs explanatory copy, and a successfully completed state does not necessarily need a call to create more work. [45]

Permission-related states belong only where a real capability depends on permission. Do not add artificial access gates merely to make a state set appear complete. Similarly, a state must not imply an operation, account, identity or persistence capability that the product does not actually provide.

### Useful error copy: outcome, known reason and next action

Error messages should use the person's language, avoid blame and be specific enough to support action. State what happened, give a reason only when it is known and safe to disclose, and explain what the person can do next. If the cause is genuinely unknown, sensitive or not yet determined, describe the uncertainty instead of inventing causality. [39], [40]

Do not expose technical exceptions, database queries or dumps, stack traces, framework versions, secrets, internal codes that reveal implementation details, or internal paths in the interface. Such details can confuse people and may disclose attack surface. Detailed diagnostics, when needed, belong in sanitized, access-controlled operational logs. [40] [75]

| Situation | Useful copy direction | Recovery |
|---|---|---|
| Unsupported input rule | "This value is not valid for the selected rule." | Retain the entered value and link to supported rules or conditions |
| Invalid range | "The minimum value is greater than the maximum value." | Highlight the affected values and allow editing without losing other criteria |
| Storage unavailable | "Your choice is available in this session, but it could not be saved on this device." | Keep the current state usable and make the persistence limitation visible |
| One region failed to load | "This region could not be loaded. The rest of the page is available." | Retry the region without resetting the whole page |
| Unknown save result | "The save result could not be confirmed." | Check and reconcile the actual state before offering a safe retry |

Use session-only wording only when the in-memory change is actually retained. If the action did not apply, say explicitly that the change was not saved or applied. A timeout, a still-pending result and a definite rejection are distinct states. Do not manufacture certainty.

When a submission or consequential operation has an indeterminate outcome, do not blindly repeat it. Preserve the uncertain state, reconcile against authoritative state, and permit a retry only according to the operation's safe retry and deduplication semantics. Interface-level duplicate prevention alone cannot resolve network ambiguity or irreversible side effects. [76]

Silent failure should be prevented, but it is not necessary to call it the worst possible error. A control that appears to do nothing gives no indication of success, error, busy state or next step. Results, waiting states and errors should be programmatically determinable so assistive technology can announce them without unnecessary focus movement. [41]

### Feedback placement by scope and consequence

Choose placement according to scope, persistence, severity, consequence and where attention already is. Do not treat every failure as a modal, and do not make a disappearing toast the sole location for a critical outcome or recovery action.

| Surface | When it is useful | Behavior |
|---|---|---|
| Changed control or content | A small, successful and obvious state update | A selected control, updated value or moved entry provides lasting confirmation |
| Non-blocking toast | A supplementary brief acknowledgment | The toast summarizes the change while the actual content also updates |
| Inline message | A field, item or region-specific issue | Place persistent text near the affected input or action until resolution |
| Section or page banner | Connectivity, storage or a broader limitation | Describe the relevant scope and recovery while leaving unaffected controls available |
| Error summary plus inline errors | Multiple fields, or errors outside the viewport | Link summary entries to fields and manage focus deliberately |
| Modal dialog | A decision is genuinely required before continuing | State the specific consequence, provide clear choices, manage focus and return to the prior context |

Do not hide retry for a failed action in a disappearing toast. A scoped error normally belongs near the affected item or control. Turning every failure into a modal increases interruption, while a broad destructive reset can justify explicit confirmation. If a modal is used, it needs an accessible name, suitable initial focus, keyboard containment while open, an honest way forward or dismissal, and focus return to the prior context. [44]

For forms with several errors, a summary and matching inline messages reduce the effort required to locate problems. Summary entries should link to their fields, and focus should move deliberately to the summary after failed submission rather than merely scrolling the page. Activating a summary link should then move focus to the affected field. [37]

Color or a red border alone is not a message. Provide visible text, semantic association with the affected field or control, and an accessible status where appropriate. [37], [41], [44] An icon may supplement the message but should not carry the meaning alone.

### Forms: clear before, patient during, helpful after

Forms should reveal requirements before effort, tolerate normal variation during entry, and provide precise recovery after an error. These principles apply only to information the product genuinely needs. They are not permission to collect identity, contact or other sensitive information without a legitimate requirement.

1. **State requirements upfront.** Use persistent labels, distinguish required and optional fields, and provide examples where they clarify the expected value. Valid ranges, supported formats and conditional rules should not become surprises after submission. A placeholder is not a substitute for a label.
2. **Choose helpful validation timing.** Do not show a negative error on an untouched field. For most fields, first validation should occur after input is complete enough to assess, on blur, or after an action attempt, depending on context. Once an error is visible, clear or update it promptly as the person corrects the value. Do not treat every incomplete keystroke as failure. [38] Inline placement and immediate timing are separate choices, and syntactic validity does not prove that an address, identifier or destination is real. [38]
3. **Make real limits understandable.** Where a hard length limit exists, state the maximum and show a useful remaining count. The displayed count and enforced validation must use the same counting model. Clarify where user-perceived characters, Unicode code points or bytes could differ. Do not overwhelm screen-reader users with an announcement on every keystroke; announce meaningful thresholds and the exceeded state.
4. **Reuse known information carefully.** Preserve or prefill known, permitted context to reduce repeated entry, while keeping every value reviewable and correctable. Do not expose another person's information on a shared device, silently overwrite current input, or imply that fictional or sample data belongs to a real identity. Prefill reducing burden is a sensible hypothesis, not a measured universal outcome in the supplied evidence.
5. **Show rules before effort.** Explain boundaries, eligibility and supported formats before entry or commitment. For password forms, show the actual requirements and useful completion status, and support password managers and autofill. For systems covered by NIST SP 800-63B-4, character-class composition rules are prohibited. That guidance specifies a minimum of 15 characters for a password used as a single authentication factor and 8 when the password is part of multi-factor authentication; support for a maximum length of at least 64 characters is a SHOULD, not a universal SHALL. It also requires allowing password managers and autofill, recommends allowing paste and a show-password option, and rejects routine forced changes when there is no evidence of compromise. It is United States digital-identity guidance for covered systems, not worldwide law. [57]
6. **Accept harmless formatting variation.** Normalize benign spaces or punctuation when interpretation is unambiguous, but never silently reinterpret an ambiguous value. For phone-number input, preserve country prefixes, extensions and meaningful leading zeros, retain the original entry where needed, and show the interpretation that will be used. Accepting a format does not validate identity or ownership. Browser-side validation helps recovery but is not complete security validation; authoritative validation is still required. [56]

After a failed attempt, preserve entered values, selected options and relevant task context. For a long set of inputs, provide both a linked error summary and inline messages. Scrolling is not enough: keyboard focus should reach the summary and then the affected field through explicit links. Do not turn a short, coherent form into an unnecessary multi-page flow. [37]

Input handling should reduce avoidable work without weakening consent, transparency, security or control. Requiring people to repeat arithmetic, formatting or reconstruction that the system can safely handle creates avoidable burden, but hidden interpretation can create a worse error. Normalize only what is harmless, disclose consequential transformations, and keep correction possible.

### Disabled controls and the validation contradiction

Disabled is a truthful availability state, not a method for making people guess validation rules. The broad instruction to keep submission disabled until every input is valid is unsafe as an always-rule. When prerequisites or validity conditions are not obvious, allowing an attempt and then presenting an accessible summary plus inline guidance is often clearer than a permanently gray control. [37]

- If a prerequisite is unclear, keep the action operable and use the attempt to expose helpful validation.
- If a required choice is absent, place the explanation near the choice area; an attempted primary action can guide focus there.
- Genuine in-flight work, an unavailable option, a reached maximum, or a previous-page action on the first page can be valid disabled states.
- Disablement during in-flight work can reduce accidental duplicate activation, but operation logic and server semantics must also handle repeated activation, retries, refreshes and ambiguous outcomes safely.
- Native `disabled` generally removes the control from ordinary operation and sequential keyboard focus.
- `aria-disabled` communicates unavailability while retaining discoverability, but it does not itself block pointer or keyboard activation. The implementation must intentionally suppress the operation and provide appropriate styling and semantics. [42]
- Do not place the reason only in a hover tooltip. Touch and keyboard users must be able to read the explanation without activating the unavailable control.
- Inactive controls have exceptions under WCAG contrast criteria, so low contrast is not automatically a conformance failure. Even so, keeping the label and reason comfortably readable is often the better product choice. Gray styling alone does not explain unavailability. [36]

The resolution is conditional: disable only when unavailability and the enabling condition are obvious, or while an operation is genuinely in progress. Otherwise, keep submission available and use it to reveal a complete recovery path. A discoverable non-operable control may use `aria-disabled`, but only with deliberate activation suppression. In every case, communicate the reason in text.

### Button and control states

Default, hover, focus, pressed, loading and disabled form a practical checklist, not an exhaustive browser or component state model. States can combine, and toggled, selected, expanded, pending, error and success states have additional meanings. Visual treatment, semantic state and actual operation state must agree. [43]

| State | Meaning and required distinction |
|---|---|
| Default | The control is available and its affordance is understandable. No single fill, outline or shadow treatment guarantees affordance in every context |
| Hover | A pointer-dependent enhancement that indicates the target under a compatible pointer. It must not reveal the only access to an essential action or explanation |
| Focus | The current keyboard target. It requires a visible focus indication and is not the same as activation or a screen reader's virtual navigation position |
| Pressed | Immediate feedback during activation. Momentary active feedback is different from a persistent toggle state such as `aria-pressed` |
| Loading | Genuine work is pending after an asynchronous action. A local activity indicator can preserve context, but not every press triggers loading, and a spinner alone is not an accessible status |
| Disabled | The action is currently unavailable. Semantics, operability, focus behavior and a readable reason must match that condition |

Hover depends on input capability, not device category. Touch and hybrid devices may support external pointers, and some touch environments emulate persistent hover. Essential controls must remain available without hover, while focus and keyboard operation need independent support. [59] [44]

Pressed feedback can be visual or, where supported and appropriate, tactile, but haptics and ripple effects are not universal. Loading should appear only for real pending work. If the whole surface cannot safely proceed, broader blocking feedback may be appropriate; otherwise local feedback avoids unnecessary interruption. Dynamic busy and result states should also be programmatically conveyed. [41]

### Proportional success feedback

For a small action, the changed state is often enough: a selected control, added filter, moved entry, or updated quantity and total can provide lasting confirmation. A brief acknowledgment can supplement that state for a meaningful addition or save, but repeated full-page interruption is unnecessary. Success must remain evident in the actual interface after any animation or toast ends. [41]

Celebratory motion is optional milestone expression, not a requirement or a psychological guarantee. Do not use it for routine edits. Respect reduced-motion preferences and preserve the person's next action. Never let celebration imply that a consequential operation occurred when the product did not perform it. A pending or unconfirmed outcome is not success. [58]

### Reversibility, undo and confirmation

Undo is meaningful only when it restores the prior state. Restoration must include the exact item or record, selected option, quantity or value, and all dependent calculations or relationships. A reassuring message without restoration is a false promise.

Reversible removal and a broad reset have different consequence levels. A destructive reset normally warrants explicit confirmation that names the scope and consequence. Routine reversible edits should not be burdened with repeated confirmation when an effective undo is safer and less interruptive.

After undo, recompute the current state correctly. If the person has added or edited the same entity in the meantime, do not blindly overwrite the newer state with an old snapshot. A move to another destination should make that destination clear and provide a restoration or move-back route. If undo is time-limited, do not make a short-lived toast the only recovery path for an important change. Also provide a durable route, such as adding the entry again or moving it back.

Confirmation is appropriate when a decision is genuinely required before continuation, particularly for broad, destructive or difficult-to-reverse consequences. It should state the specific effect, distinguish the choices, avoid manipulative wording, and return focus to a logical place if canceled or completed. Confirmation should not substitute for designing a reversible operation where reversal is feasible.

### Partial failure and graceful degradation

One surface can combine data or operations with different dependencies. A late or failed region does not automatically make every other region unusable. Preserve unaffected utility when it remains meaningful and internally consistent, and give a failed region scoped status and recovery.

This rule is conditional. Sections that share totals, permissions, filters, entitlement, a transaction boundary or a required snapshot may need to fail or refresh together. Individually fresh regions can still be mutually inconsistent. Presentation-component boundaries are not automatically data-consistency boundaries, and every component does not need to fetch independently. Shared cache, parent-owned data or coordinated requests may reduce duplication and preserve consistency. Isolate failures at meaningful task and dependency boundaries, not mechanically at every visual boundary.

Graceful degradation means preserving essential utility through an acceptable fallback when richer behavior is unavailable. Progressive enhancement is related but distinct: it begins with a robust baseline and adds enhancements. Neither concept requires every visual section to own its own data request. [52]

Stale content can preserve utility while fresh content is obtained, but the interface must not disguise reduced confidence. RFC 5861 documents bounded stale-while-revalidate behavior, not permission to present all stale information as current. [51] Descriptive or low-consequence content may tolerate staleness differently from permissions, availability, totals, identity-sensitive state or other information used for consequential commitment. Preserve provenance and relevant freshness, avoid silently reordering content under the pointer, do not erase current choices during refresh, and revalidate consequential facts before commitment.

Local retry should be safe and dependency-aware. Retry only the affected region when it is truly independent. If shared truth is uncertain, reconcile or refresh the coupled boundary together. Never invent freshness, availability or successful recovery.

### Optimistic updates versus confirmed state

An optimistic update presents an expected result before authoritative confirmation, then converges with confirmed state or visibly handles failure. It is not the same as an immediate local change that has already committed synchronously. Calling committed local state speculative would misdescribe the behavior.

Optimism is safest for likely-to-succeed, reversible, low-consequence actions. It is a poor default for irreversible effects, scarce resources, permissions, identity-sensitive changes or other operations where a false success could cause harm. Pending, confirmed and rejected states must remain distinguishable.

Rollback alone is not a complete UX. Overlapping changes, responses arriving out of order, failed revalidation, authoritative transformations, rejection and irreversible side effects may require identifiers, sequencing, deduplication or reconciliation. A silent snap-back can look like a defect. When an optimistic action fails, explain what was reversed or remains uncertain, preserve useful context, and provide a safe recovery path. 

The lasting interface must reflect authoritative truth. A transient acknowledgment can communicate intent or progress, but it must not assert confirmation before confirmation exists. If the outcome cannot be confirmed, retain an unconfirmed state, prevent unsafe blind repetition where necessary, and reconcile before declaring success.

## 8. Engagement and return loops without compulsion

### Separate useful engagement from compulsion

Research does not establish a universal "dopamine button," commitment streak formula or ideal reward schedule. Evidence about autonomy, habit and gamification should not be converted into certainty for a particular product or task. [7], [8], [9] Gamification must be evaluated element by element because a progress indicator, point system, streak, badge, variable reward and social ranking do not have the same mechanism or consequences.

A legitimate return loop is:

**Genuine need -> useful action -> understandable benefit -> voluntarily saved context -> easy return when needed.**

This loop respects self-determination by preserving meaningful choice, competence and control. It helps people resume a task instead of manufacturing a reason to remain active. A person completing a task and leaving can be a successful outcome. Interaction volume alone is not meaningful satisfaction.

### Saved state and continuity

Continuity creates honest reasons to return when it saves work or preserves relevant context.

| Loop | User value | Honest boundary |
|---|---|---|
| Search -> shortlist -> compare -> save | Organizes a decision | State where saved choices are stored and whether they persist across browsers, devices or accounts. |
| Item view -> related alternatives -> explanation | May reveal an option that better fits the need | Base relationships on actual category, cost or attribute matches and explain the reason. |
| Save -> return later | Avoids starting again from zero | Do not promise synchronization or permanence that the system does not provide. |
| Preference guide -> shortlist -> adjust | Helps clarify preferences | Use understandable rules and editable inputs. |
| Edit a pending selection -> review consequences -> undo | Makes consequences and control visible | Do not imply that a transaction or irreversible operation occurred if it did not. |
| Recently viewed -> revisit an item | Recovers earlier context | Make history removable and resettable, and accurately describe where it is stored. |

Saved state should be predictable. People should be able to tell what was saved, for how long, where it is available and how to remove it. Local storage, account synchronization and organization-wide records are different capabilities and must not be presented as interchangeable.

Recommendations should use reasons derived from actual available data. Do not imply hidden live personalization when the logic is deterministic or based only on the visible record. Explanations help people assess relevance and correct preferences rather than passively accepting a ranking.

### Habit support without coercion

Habit support is appropriate when repetition serves a recurring user goal. The interface can reduce restart costs, remember voluntary preferences, preserve progress and make the next useful action clear. It should not create artificial loss, anxiety or social pressure to force repetition.

The following mechanisms do not belong in an autonomy-respecting return loop:

- Daily commitment or purchase streaks that pressure activity regardless of need.
- Spin-to-win or gambling-like reward loops.
- Fake scarcity or countdowns.
- Forced sharing or registration.
- Surprise additions to a pending selection.
- Shame-based opt-out language.
- Interruptions that are difficult to dismiss.
- Notifications that pretend real organizational or user activity is occurring.

These patterns can increase interaction counts without improving the result. Success measures should distinguish voluntary task completion and useful return from prolonged sessions, repeated dismissal or compliance under pressure.

### Notifications and re-engagement

A notification should correspond to a real event, an explicitly requested reminder or a recurring need the person has chosen to support. It should not fabricate activity, urgency, popularity or a relationship. Re-engagement messages should make their reason understandable and should return the person to relevant, preserved context.

Permission to notify is not permission to send every possible prompt. Frequency and content should remain controllable, and stopping a notification stream should not require disproportionate effort. If saved context exists only in one browser or for a limited time, a message must not imply broader or permanent continuity.

Gamified or notification-based prompts require the same evidence discipline as other interface claims. A reward must be real, its conditions must be visible and the action needed to receive it must not be misrepresented. A progress display must represent actual progress. An urgency message must correspond to a real, relevant deadline or constraint.

## 9. Dark patterns, honest persuasion and regulatory context

### What the evidence does and does not establish

The OECD discusses consumer detriment arising from deceptive, coercive and manipulative choice architecture. [21] This framing covers more than isolated misleading text. Defaults, obstruction, visual hierarchy, timing, repetition and withheld information can shape a decision.

Experiments by Luguri and Strahilevitz found that dark patterns could change immediate sign-up behavior in their specific study context. It would therefore be inaccurate to claim that dark patterns never work. Immediate compliance, however, is not equivalent to **informed satisfaction, repeat trust or long-term profitability**. [22]

An FTC staff report preserves an important legal distinction: some patterns have been found consistently unlawful, while some situations require case-specific evaluation. The cited excerpts do not support blanket legal conclusions. [23] Ethical review and legal review overlap, but neither should be reduced to a list of visual tricks.

### A practical taxonomy and honest alternatives

The patterns below organize the named risks in the source material. They are safeguards rather than an exhaustive legal taxonomy.

| Pattern | Deceptive or coercive treatment | Honest alternative |
|---|---|---|
| Invented reference value or discount | Presents an unsupported higher comparison value to make the current value seem favorable | Compare against a real, applicable lower or higher value and explain the basis. |
| Unsupported personalization | Claims an option is "best for you" without evidence | Give a recommendation reason supported by actual available attributes and allow preferences to be edited. |
| False urgency | Uses fake scarcity, "only one left" claims or countdowns to pressure action | Show availability or a deadline only when it is real, current and clearly scoped. |
| Drip pricing or hidden charges | Reveals required costs late in a flow | Show an understandable cost breakdown early enough to affect the decision and update it consistently. |
| Fake reviews or testimonials | Fabricates endorsement, verified status, customer media or activity | Label samples clearly and show verified status only when evidence supports it. |
| Preselection or surprise additions | Selects unwanted add-ons or inserts items without an intentional choice | Leave optional additions unselected and make preferences editable. |
| Forced action | Requires saving, sharing, registration or another unrelated action merely to continue | Allow voluntary saving and provide a direct path through the primary task. |
| Bait-and-switch | Promises one result but performs or reveals another | Make the action label, immediate consequence and eventual result agree. |
| Disguised advertising | Makes promotional content appear to be neutral content or navigation | Label promotional and third-party content clearly and distinguish it visually without hiding it. |
| Shame-based opt-out | Uses insulting or guilt-inducing refusal language | Offer a neutral, clear decline choice. |
| Obstruction | Makes dismissal, cancellation, removal or another protective action disproportionately difficult | Make exit and reversal paths easy to find and proportionate to the initiating action. |
| Compulsive reward design | Uses daily streaks, spin-to-win mechanics or gambling-like variable rewards to drive activity unrelated to genuine need | Support recurring goals through saved progress, predictable benefits and voluntary reminders. |
| Fabricated activity | Sends notifications or shows live counters that pretend real activity is occurring | Communicate only events and counts backed by current evidence. |

Persuasion is not inherently deceptive. Transparent comparison, a supported recommendation, a truthful deadline, an editable preference and a clearly explained benefit can help a person decide. The dividing questions are whether the material facts are accurate, whether important consequences are visible, whether the person retains a meaningful choice and whether declining is unduly difficult.

### Regulatory context across jurisdictions

The OECD report provides an international policy example concerning deceptive, coercive and manipulative choice architecture. [21] The FTC materials provide United States examples, while Indian consumer-protection guidance provides another jurisdictional example. These sources show that deceptive interface design receives regulatory attention, but they do not establish one globally uniform taxonomy or obligation.

Official Indian Central Consumer Protection Authority guidance issued on **30 November 2023**, described in a **8 December 2023** Press Information Bureau release, identifies **13 specified dark patterns**. The available excerpt mentions false urgency, drip pricing, disguised advertising and bait-and-switch among those practices. [24]

A **2025 advisory** encourages e-commerce organizations to conduct self-audits and avoid deceptive interfaces. The exact release date was not independently verified. [25] This is a source limitation and should remain explicit.

The United States Federal Trade Commission's **14 August 2024** announcement concerns its final rule on fake reviews and testimonials, including prohibited sale and purchase practices. [15] It is a United States source and should not be presented as legal advice for India or any other jurisdiction.

These documents are examples of jurisdictions and institutions with relevant rules or guidance. They are not a current, exhaustive statement of law, legal advice or compliance certification for any product. Full legal text, definitions, exceptions, applicability, enforcement history and later changes require independent verification in every relevant jurisdiction.

## 10. Accessibility and mobile usability

Accessibility is part of functional usability. An attractive interface cannot compensate for interactions that some people cannot perceive, understand or operate. Accessibility decisions also improve mobile use because both depend on clear targets, stable layouts, multiple input routes and feedback that does not rely on one sensory channel.

### Target size and spacing

Target-size requirements and comfortable touch guidance are related, but they are not interchangeable:

| Guidance | Indexed understanding | Qualification |
|---|---|---|
| WCAG 2.2 SC 2.5.8, Level AA | Pointer targets are at least 24 by 24 CSS px, subject to exceptions | Spacing and the other stated exceptions matter [16] |
| WCAG SC 2.5.5, Level AAA | Enhanced guidance specifies a 44 by 44 CSS px target, subject to exceptions | Do not confuse this enhanced criterion with the Level AA rule [17] |
| Mobile usability practitioner guidance | Primary mobile controls are approximately 44 to 48 CSS px, or comfortably larger | This is a useful starting range for usability, not a compliance certificate |

The claim that every Level AA button must be 44 pixels is therefore incorrect. Compliance depends on the exact success criterion, its target definition and its exceptions. Practical comfort depends on more than conformance: target spacing, hand position, device size, input method, motion and the cost of an accidental activation all matter.

### Contrast, focus and motion

- A practical text-contrast baseline is at least 4.5:1 for normal text and 3:1 for qualifying large text. Essential active-control boundaries and state indicators generally fall within the 3:1 non-text contrast criterion. Decorative and inactive content, and the standard's other exceptions, must be distinguished rather than treated as equivalent cases. [18], [36]
- Keyboard focus must be visible. An element with keyboard focus must not be completely hidden behind author-created content such as a sticky bar, drawer or overlay. The minimum criterion for partial visibility and the enhanced expectation for visibility are not the same requirement. [19]
- Respect the user's system motion preference through `prefers-reduced-motion` where motion is not essential. A reduced-motion treatment should remove or quiet unnecessary movement without removing status, structure or meaning. [20]
- Selection, validation and error states must not be communicated by color alone. Pair color with text, an icon, a pattern, a border treatment or another perceivable cue.
- Keep body content readable. Tiny metadata must not be the only location of information required to understand an object or make a decision.

These points are practical requirements and review prompts, not a complete WCAG audit. Formal conformance requires systematic evaluation against all applicable criteria, including testing with relevant assistive technologies and interaction modes.

### Operability across interaction modes

- Every control must be usable from the keyboard, with a visible focus indicator and a logical focus sequence.
- Icon-only controls need understandable accessible names that state the action or outcome. Name an action such as "Save item", not the icon's appearance.
- Information or actions revealed on hover must not be available only through hover. Supply a keyboard and touch equivalent, maintain readable persistence where needed, and provide predictable dismissal behavior.
- Drawers and dialogs need predictable opening, closing and focus behavior.
- Sticky interface regions must not obscure focused controls, primary content, dialogs or fields exposed above an on-screen keyboard.
- Mobile views must preserve the meaningful capabilities available in wider views, including filtering, comparison and editing a pending selection. Responsive design may change the composition, but it must not silently remove essential task routes.

### Fitts's Law in context

Fitts's Law supports the general conclusion that target size and distance affect acquisition time and accuracy. It does not prescribe one universal placement or one target dimension for every device. Thumb reach varies with hand, grip, screen size, orientation, posture, task and input device. [35], [55]

Design the actual interactive region, not merely the visible icon:

- A visually small icon can have a larger hit area around it. Inspect and test the real clickable area rather than assuming the artwork defines the target.
- Adjacent controls for saving, comparing, removing or editing a value must not have overlapping or unpredictably close hit regions.
- A checkbox's associated text label should also activate it, so the small square is not the only target.
- A destructive action and a frequent adjacent action must be separated enough to reduce casual wrong taps.
- Frequently used navigation and action targets should remain in predictable locations. Late-loading media, banners or content must not shift them beneath a pointer or finger.
- Approximately 44 to 48 CSS px is a useful comfortable starting range for primary mobile controls, but testing on actual devices must assess missed taps, reach, spacing and the consequences of error.

Finger-friendly interaction is therefore a combination of hit area, spacing, semantics, cancellation and layout stability, not simply larger-looking icons.

### Whole-card activation, nested targets and pointer cancellation

A card or list item can make its primary destination easy to activate without turning every part of the container into one indiscriminate control. The primary link and nested actions such as save, compare, select or remove must each have independent meaning, accessible names and keyboard routes. Do not nest buttons or links inside one giant button.

Card-level activation must also coexist with text selection, image gestures, scrolling and nested controls. Starting a scroll on a card must not accidentally open its destination. For single-pointer operations, preserve normal release-based activation and cancellation rather than firing an irreversible action on pointer-down, except where a genuine task-specific exception applies. A person should be able to move the pointer or finger outside the target to cancel where the standard calls for it, and the interface must distinguish drag or scroll gestures from taps. [36]

Wrong taps are not only a small-icon problem. Investigate layout shift, overlapping hit areas, double activation, delayed feedback, event propagation and gesture handling as possible causes.

### Keyboard, screen readers and status messages

- Match focus order to a sensible visual and task order. Avoid positive tab-order values that create unexpected jumps.
- Use buttons for actions and links for navigation, preserving their expected keyboard behavior.
- Focus must not itself trigger selection or activation. Screen-reader reading position and document keyboard focus are related but are not always the same thing.
- Give every dialog an accessible title. When a modal opens, move focus to an appropriate location inside it, contain modal navigation, support a suitable close or Escape behavior, and return focus to the trigger or another relevant context when it closes.
- Associate an inline error programmatically with its input. If an error summary links to a field, activate the link by moving focus to the correct field; scrolling the page alone is insufficient.
- Make consequential updates, result counts and errors available through appropriate live-region or status messaging. Do not create repeated announcements on every keystroke or routine render.
- Routine success feedback should not steal focus. Moving focus for a blocking failure or an error summary should be deliberate and useful. [41], [43], [44]

Visible feedback and assistive-technology status are complementary. A visual change alone may be missed by a screen-reader user, while an excessively chatty live region can make the interface harder to operate.

### Device, input, viewport and locale

Treat mouse, touch, keyboard, hybrid devices and assistive technology as first-class input routes. Do not assume that a device category implies one input method. A touch-capable laptop may still be used with a keyboard and pointer, while a mobile device may use an external keyboard or assistive switch.

Hover is absent on many touch interactions. When hover or focus reveals extra content, provide equivalent access for touch and keyboard, ensure the content can remain visible long enough to read, and make dismissal predictable. Essential facts and actions must never depend on hover alone. [59]

On small viewports, account for one-handed use, both orientations, text zoom, the on-screen keyboard and the space occupied by browser interface elements. Bottom navigation is one available pattern, not a mandatory location for any particular action. Sticky navigation, filter bars and primary-action bars must not cover content, focus indicators, dialogs or keyboard-visible fields. [60]

Locale affects both content and layout:

- Format monetary amounts, number grouping, decimal separators, units and dates consistently and unambiguously for the chosen locale.
- Allow longer translated labels and messages to wrap without clipping, overlap or lost actions.
- Test scripts with different character shapes, line-height needs and text expansion rather than treating translation as a string replacement exercise.
- For right-to-left support, adapt reading order, directional layout and directional icons where context requires it. Do not blindly mirror media, logos, numbers or every icon.
- A country or language label does not establish uniform reading habits, device behavior, grip or motor ability. Convention is a combination of audience, device, input and language context. [61]

## 11. Speed, stability and resilience

Performance reduces actual waiting. Feedback reduces uncertainty during the waiting that remains. Neither is a substitute for the other, and neither justifies artificial delay or a page-wide blocker for an unrelated local task. Even a usually fast system must handle slower devices, variable connections, delayed dependencies, stale data and failure without losing the user's context.

### Core Web Vitals

| Metric | Meaning | "Good" threshold in the referenced guidance |
|---|---|---|
| LCP | Loading of the largest visible content element | 2.5 seconds or less |
| INP | Interaction responsiveness | 200 milliseconds or less |
| CLS | Visual layout stability | 0.1 or less |

Threshold assessment is based on the **75th percentile**, segmented by mobile and desktop. [26]

These are performance targets, not measured results for an untested product and not promises of adoption, completion or conversion. A local screenshot, a development preview or one synthetic run does not establish real-user field performance.

Practical implications include:

- Reserve image dimensions and content space so loading does not make the layout jump.
- Avoid rendering thousands of complex cards or rows simultaneously when pagination, windowing or a limited visible result set can reduce initial work.
- Use appropriate deferred media loading and limit work outside the current viewport, while ensuring that deferred content remains discoverable and accessible.
- Keep search and filter computation from unnecessarily blocking input.
- Do not let large animation sequences delay the user's next action.
- Use loading indicators to explain genuine waiting. Never create waiting merely to display an indicator.
- Do not treat performance in a small, local or static environment as proof that the architecture will perform at production scale.

### Choose feedback by the kind of wait

**Show the result as soon as it is ready. Choose an indicator according to the work, its structure and what can honestly be measured.**

| Situation | Useful treatment | Neutral application |
|---|---|---|
| Result immediately committed | Actual result, with no forced loader | A local save or ready filter update changes directly |
| Known structure, content pending | Skeleton with reserved geometry | A list, dashboard region or detail region before data arrives |
| Small action, unknown completion amount | Inline spinner or activity indicator with a clear label | A genuine pending save beside the affected control |
| Measurable completed work | Determinate progress | A count or percentage only when real work units are available |
| Distinct genuine stages | Meaningful step or status labels | State the current real stage, not invented checking messages |
| Prolonged or uncertain wait | Persistent explanation and recovery | Offer retry, cancel or continued use of unaffected content where safe |
| Failure already known | Error and next action immediately | End loading without waiting for an animation cycle or artificial minimum |

A skeleton communicates the expected shape of content. A spinner communicates unquantified activity. A determinate progress indicator communicates measured completed work. Exact duration does not have to be known for determinate progress: completed bytes or units may be measurable even when the estimated completion time is uncertain. Never invent a percentage such as 73%, a false countdown or fictitious stages for indeterminate work. A screen does not need every kind of indicator. [46], [47], [48], [49]

Skeletons are not universally perceived as faster. Their effect can vary with the task, and the strongest defensible rule is to use them when a stable preview of the eventual structure is informative. [77]

### Timing and response-time guidance

- Acknowledge input immediately with a pressed response, selected state or scoped pending label. For very fast operations, avoid a distracting spinner flash, but do not delay a ready result merely to avoid that flash.
- Practitioner guidance suggests that sub-second looped indicators can distract, roughly 2 to 10-second work can use looped feedback, and longer work benefits from percent-done information when real progress is measurable. These are heuristics, not fixed biological timers or mandatory switching points. [46]
- Familiar rough response-time bands can help teams reason about attention and interruption, but they are not hard-coded psychological deadlines. Do not turn one, five or ten seconds into universal rules such as "show this exact component now" or "this message buys one more second." [11], [46]
- Blank uncertainty can lead people to wonder whether the command was received, but that does not mean every brief operation needs a spinner. Direct state feedback can be enough.
- A known failure should appear as soon as it is known. Do not conceal it until a minimum animation duration has elapsed.
- Long tasks may need cancellation, safe background completion, estimates or notifications in addition to an indicator.

The historical progression of waiting feedback is useful context, but it does not establish timeless interface laws. Early graphical systems used wristwatch and hourglass wait-cursor motifs. The available historical summaries do not establish every original animation behavior, and the fact that an hourglass remained a default motif does not mean a platform lacked all animation capability. [71] [72]

Percent-done progress research was published by Myers in 1985, so the claim that progress bars first appeared only in the late 1980s is too late and too absolute. A 2014 CMU retrospective says 48 students performed computer searches and 86% said they liked the bars. It separately reports Myers's recollection that people tolerated some inaccuracy and still preferred a progress bar to no feedback. Those statements must not be merged into a claim that 86% preferred deliberately inaccurate progress, and they do not permit deceptive measurement. [70] [69]

In 2013, Luke Wroblewski described and named skeleton screens in an account of gradually loading blank page structures. That source documents description and popularization, not invention of every placeholder-layout technique in 2013. [47]

The lasting lesson from this history is functional rather than chronological: distinguish "activity is happening" from "this is the expected shape of the result" and "this much measured work is complete."

### Stable layout and honest progress

- Make a skeleton approximate the real content layout without resembling fabricated final content. Placeholder rows must not read as real ratings, values or facts. Shimmer is optional, and reduced-motion mode should use a quieter treatment.
- Keep button width and height, media space and affected regions stable so the feedback itself does not cause layout shifts.
- For a long wait, replace an indefinitely repeated generic loading message with actual context. Show measurable progress when available; otherwise state uncertainty honestly.
- A percentage must represent completed work. If transfer is complete but processing remains, explain the stage rather than implying the whole action succeeded at 100%.
- Drive changing status text from real state transitions, not a decorative carousel of reassuring messages.
- Prevent late responses from reviving an abandoned request or replacing newer results with those from an older query.
- Keep retries bounded and preserve user context. Where cancellation or navigation is safe, explain it. Canceled or abandoned work must not later produce a misleading success message.

### Visible effort without artificial waiting

Labor-illusion research explores how visible operational effort can affect perceived effort and value. Across five simulated travel and matching-service experiments, one experiment involved 266 participants and waits from 10 to 60 seconds, while the other experiments had 118, 143, 116 and 280 participants. Conditions received identical results, and operational transparency often increased perceived effort or value. The effect had boundaries: poor outcomes could reverse it, excessive waits reduced the benefit, and suspected manipulation could undermine trust. [50]

This evidence is not a universal delay strategy. Explain genuine work and the useful result of that work. Do not hold back a ready result behind a multi-second performance, invented verification, fictitious scanning or a theatrical countdown. Real network, service or file-processing work may take time, but imaginary work should not be presented as proof of care. Gambling-style anticipation is not evidence for beneficial loading design.

### Partial loading and meaningful failure boundaries

Do not hold a ready, independently useful region for the slowest optional region. If an optional panel fails, the core task can remain available while that panel presents its own error and retry. Preserving useful core behavior is graceful degradation; starting from a robust baseline and adding optional enhancements is the related progressive-enhancement approach. [52]

**Visual sections are not automatically independent data units.** Shared caches, parent-owned data and coordinated responses can all be valid. Separate fetching for every component is not a requirement. Isolate failure at meaningful task and dependency boundaries while preserving states that must remain consistent.

| Dependency | Safe partial behavior | Avoid |
|---|---|---|
| Core facts versus optional commentary | Keep known core facts usable; let commentary retry locally | Blank the entire detail view because commentary failed |
| Search results versus optional recommendations | Keep matching results and controls usable | Describe a recommendation failure as "No results" |
| Selected option versus dependent value or availability | Coordinate the state or mark dependent information clearly pending | Present a new option label with an old dependent value as current |
| Edited lines, conditional rules and aggregate total | Preserve one coherent calculation or snapshot | Combine an updated line with an old total or stale conditional value |
| Primary data itself invalid | Give a useful explanation and a valid recovery or navigation route | Invent records or silently substitute key values |

When core data is unavailable, explain why the affected action is unavailable or pending. Unrelated useful regions may continue. A retry should target the failed unit where safe, preserve current choices and avoid an indefinite silent retry loop.

The familiar checklist of loading, success, error and empty is useful but not exhaustive. Distinguish first-use no-data, search with no results and task-complete emptiness. Also design permission-denied, offline, stale, partial, pending, canceled, conflict and recovery states where applicable. [45]

### Cached content and refresh

Keeping known-safe content can be better than flashing an empty region. `stale-while-revalidate` is a documented caching mechanism that can serve a previous response while revalidating in the background, but the interface policy must reflect the consequences and freshness requirements of the content. [51]

- Previously loaded descriptive content or imagery may remain temporarily useful. Do not silently present stale consequential values, availability, permissions or commitments as current truth.
- Limit refresh status to the relevant region. Do not combine old and new versions into a contradictory object, summary or transaction state.
- Refresh must not reorder a list beneath the user's pointer, remove focus or reset selected options without a justified and understandable transition.
- If refresh fails, retain the last usable content when safe, with an honest limitation and a retry rather than a false claim of freshness.
- When saved data is incompatible with the current data version, explain missing or changed records and options. Do not silently fabricate replacements.
- Offline or disconnected status must reflect the actual condition and capability. Locally available content may remain usable while network content is unavailable. Do not use "offline" as a generic label for denied permission, invalid data or zero results.

Cached content should retain enough provenance or freshness information for the system to avoid treating it as authoritative during consequential commitment. Background refresh is not permission to hide meaningful staleness.

### Immediate state and optimistic UI

**An already committed local change is real immediate feedback. Optimistic UI displays the expected result of an unconfirmed operation before authoritative confirmation.** Do not use the labels interchangeably. Optimistic behavior is an interaction strategy, not a mandate for a particular architecture or library. [53], [54]

If an immediate change applies successfully, show the changed state at once. If persistence fails, state what remains true, such as whether the change lasts only for the current session or failed entirely. Do not promise permanent saving without confirmation.

When using optimistic behavior:

1. Choose a low-risk, reversible action with a valid rollback or recovery path.
2. Retain the prior confirmed state and the user's latest intent.
3. On success, reconcile with the actual authoritative result rather than preserving an assumed value.
4. On failure, correct or roll back the affected change, explain the failure nearby and offer a safe retry. A silent visual reversal can look like a glitch.
5. Prevent rapid toggles and out-of-order responses from overwriting the latest user choice.
6. Ensure retry does not duplicate additions, repeat value changes or erase later edits.
7. Keep every representation of the same state, such as a row, count and aggregate summary, aligned with one reconciled truth.

Do not display optimistic success for an irreversible or high-consequence outcome. If submission succeeded but the response was lost, the outcome may be unknown rather than failed; recovery must check authoritative state before inviting a potentially duplicate action.

### Recovery is part of the experience

Plan and test at least these recovery conditions where they apply:

- An empty search and zero results after combined filters.
- An empty saved set, pending selection or comparison.
- An unavailable object or option.
- An invalid or obsolete destination.
- A missing or invalid saved comparison entry.
- Corrupted local state.
- Reload and back or forward navigation.
- Reset confirmation and the post-reset state.
- Slow or failed media and optional-panel loading while core content stays usable.
- Failed refresh with previous usable content and an honest status.
- Rapid repeated interactions, or a changed query before the previous result returns.
- Local storage blocked or full, an uncertain save, or persisted data incompatible with the current data version.
- Keyboard or touch recovery after a dialog closes, validation fails or an item is removed.

Recovery must explain what happened and offer a valid next action. Preserve context and user input whenever it is safe to do so. Silently inventing data, hiding failure or showing success after a failed state change is not recovery.

Fewer genuinely connected interactions are more credible than many dead controls. This is a product-quality judgment, not an empirical claim that fewer screens or features produce better outcomes. Fast systems still need resilient states because no performance target eliminates variability in devices, connections, dependencies or user actions.

## 12. Surface archetypes: a UX reference by screen type

The reference below describes the user's job and the experience rationale for each surface archetype. **It is neither a build order nor an implementation commitment.** A product may combine several archetypes on one surface or distribute one archetype across several surfaces, but the corresponding interaction obligations still apply.

| Surface archetype | User's job | What the surface must make clear | What it must avoid | States it must handle |
|---|---|---|---|---|
| Entry or overview surface | Understand what is available and where to begin | Product scope, original identity and useful discovery entry points | A generic presentation with no clear purpose or starting point | Initial, loading where necessary, ready, partial failure and unavailable |
| Browse or listing surface | Explore a relevant family or related assortment | Meaningful organization and information appropriate to the collection | Uniform information that ignores the collection's decision criteria, or unsupported claims about a provider or source | Loading, ready, filtered, empty first use, no match, partial failure and stale |
| Search results | Find matching entities and narrow the result set | The active query, active filters, sort order, accurate result count and recovery controls | Hidden constraints, invented matches, or presenting no matches as a system failure | Searching, results, no match, corrected query, partial failure, error and stale results |
| Detail view | Judge whether an entity and its selected option are suitable | Media, descriptive attributes, key numeric values, applicable sample or real policies and availability, all aligned with the selected option | Enabling a dependent action when a required option, value or availability is unresolved | Loading, ready, option unselected, option selected, unavailable, partial failure, stale and error |
| Offers or conditional-rules surface | Understand a benefit and its conditions | Eligibility, arithmetic, restrictions and whether the content is real, sample or fictional | Fake urgency, hidden conditions and inconsistent calculations | Eligible, ineligible, pending determination, expired or unavailable, error and empty |
| Guided finder or wizard | Clarify a need, category, constraint or budget and receive a manageable shortlist | Editable inputs, deterministic behavior and an understandable basis for the shortlist | Pretending that a recommendation is independent of its inputs, or hiding the reasons for an outcome | Initial, in progress, validation, results, no match, revised input and error |
| Comparison view | Understand meaningful differences among alternatives | Compatibility, aligned attributes, selected alternatives and highlighted differences | Comparing incompatible entities as though attributes were equivalent, or obscuring missing data | Empty, partially filled, ready, item unavailable, attribute unavailable and error |
| Saved items or collection | Preserve, revisit and change a shortlist or local history | What is saved, what was removed, the scope and duration of persistence, and whether history is local | Claiming account sync, permanent storage, cross-device history or tracking that does not exist | Empty first use, ready, adding, removing, undo, blocked storage, session-only and stale |
| Pending-selection summary | Manage selected entities, options, quantities or values and a computed total | The exact entity and option, editable quantity or value, adjustments, total and available recovery | Totals that disagree with line items, removal without recovery where recovery is reasonable, or a celebratory state that implies a later commitment | Empty, ready, editing, recalculating, unavailable item, invalid quantity, removal, undo and error |
| Review-and-confirm step of a multi-step flow | Inspect the consequences and details of a pending commitment before its allowed endpoint | Whether the step is interactive or read-only, whether any commitment will occur, and where to edit or leave | A submit mechanism, confirmation or alternate route that exceeds the product's actual capability | Ready, incomplete prerequisite, read-only, changed upstream data, unavailable action and error |
| Read-only profile or history surface | Understand an account, profile, history or tracking concept | Whether records and identity are real, sample or fictional, and whether any controls can change them | Implying authentication, live tracking, personal-data collection or newly created records when none exists | Empty, ready, read-only, stale, partial failure and unavailable |
| Settings or reset actions | Restore or clear locally retained choices | The scope and consequence of clearing data, followed by appropriate confirmation | A vague reset label, silent destructive clearing, or a claim that remote data was changed when only local state changed | Default, confirmation requested, resetting, complete, partial failure and error |
| Empty and error recovery surface | Understand why content is absent or an operation failed, then continue safely | The known cause, the scope of the problem and a useful next action | Fabricated success, invented content or an error message that claims more certainty than the system has | Empty first use, no match, cleared, partial failure, complete failure, retrying and unknown outcome |

### Entry, browse and search surfaces

An entry surface should answer two questions quickly: what can be done here, and where should the user begin? Original identity matters, but identity must not displace clear scope and familiar discovery routes.

A browse surface should preserve the breadth that is genuinely available while using useful grouping and narrowing to make it manageable. A related assortment may be organized around a source, provider or collection, but any identity attached to that assortment must be labeled according to its real status. Links must lead to actual available records rather than imply a broader connected marketplace, repository or network.

Search results must keep the query and active constraints visible. If a query combined with filters produces zero matches, explain that no results meet the current constraints and allow individual filter removal or clearing. A spelling suggestion may be offered only when the system supports it. Do not relabel a valid no-match outcome as a system error, and do not invent matching entities.

Returning from a detail view should retain useful query, filter, sort and position context. Losing this context forces the user to reconstruct work and makes inspection unnecessarily expensive.

### Detail and conditional-rule surfaces

A detail view must keep option-specific media, descriptive attributes, key values and availability coherent. If an option is required, mark that requirement clearly. When the selection changes, every dependent value and action must update to the corresponding state. The selected state must also be understandable through keyboard interaction and assistive technology, not only through a visual treatment.

Partial failure should be scoped. If optional commentary or supporting content fails while the core entity information is ready, keep the core content available and place an explanation and retry control in the failed region. If a key value or required option remains unresolved, do not present a dependent action as confidently available.

An offers or conditional-rules surface must explain the benefit, eligibility and restrictions together. Its calculations must remain internally consistent, and sample arithmetic must be labeled as sample arithmetic. Urgency, scarcity, endorsement or eligibility must never be fabricated.

### Guided discovery and comparison

A guided finder should make its inputs editable and its behavior understandable. If the same inputs are designed to produce the same shortlist, the interface should not imply an independent human judgment or unexplained intelligence. Recommendations should be traceable to real attributes, and users must be able to revise the preferences or constraints that shaped them.

A comparison view should align equivalent attributes, expose missing values and emphasize meaningful differences among compatible alternatives. Earlier exploration in the source considered **up to four compatible alternatives**, but this was an interface assumption, not a research-proven optimal comparison count. Treat any comparison limit as a product decision that must be evaluated against content width, task complexity and device constraints.

### Saved items, local history and pending selections

Saving and local history require truthful state feedback. Add and remove operations should update the actual collection, and the interface should state whether persistence lasts only for the session, for the same browser or through a signed-in service. If browser storage is blocked, a retained in-session state may still be shown, but the reload limitation must be explained. Do not silently simulate persistence that will disappear.

A pending-selection summary must be option-aware and arithmetically correct. When an entity is added, the correct entity, option and quantity or value must appear in the actual collection. Any badge, line item, adjustment and total must agree. Removing an entry must update the badge and total. Undo must restore the correct entity, option and quantity while preserving intervening edits. Removing the last entry must lead to a legitimate empty state, not a celebration or confirmation that implies a commitment has been completed.

Local recently viewed history may help users revisit prior exploration. It does not establish cross-device tracking, shared-account history or permanent retention. The surface must describe only the scope the system actually provides.

### Review, read-only history and reset surfaces

A review-and-confirm surface must state whether it can complete a commitment. If the supported experience ends with a read-only preview, say so at the point where a user might otherwise expect submission. Provide routes to edit the pending selection or return to exploration. Do not expose a hidden submit action, direct route, newly completed record or success surface that contradicts the stated boundary.

A read-only profile or history can explain a concept without providing authentication or live account behavior. Fictional identity, historical records and tracking data must be labeled. Existing presentation data and a newly created simulated record are different: showing the former does not justify implying the latter.

A reset action may clear local choices, saved items, comparisons or history. Its label and confirmation should identify what will be cleared. Completion feedback must correspond to the actual scope of the reset.

Across these archetypes, a coherent experience may connect discovery, narrowing, comparison, detail inspection, option selection, saving, pending-selection editing and review. The continuity of that journey does not authorize the interface to imply a final action or outcome that the underlying product cannot perform.

## 13. Truthful interfaces: what a UI can and cannot claim

### Truth is an interaction-wide requirement

The central question for every state is: **Does the interface claim only what the system actually knows and has done?** Loading, success, errors, cached content and optimistic updates are different visual situations, but each can misrepresent operational truth. A fake loading stage pretends that work is occurring. An incorrect failure message pretends certainty. Stale information presented as current pretends freshness. An optimistic completion presented as final pretends persistence or commitment. Treating these as one truthfulness problem is a synthesis across technical contexts, not a quoted universal law. 

Truth also requires complete interaction contracts, not merely a standard set of screens. A spinner without a failure exit, a success message without persisted state and an error without recovery are incomplete. Real interactions may be partially loaded, stale but usable, invalid while being corrected, unavailable for a stated reason, or pending with an unknown outcome. 

### Label sample, fictional and provisional content

Sample or fictional entities, people, commentary, numeric values, offers, availability, time estimates, policies, profiles and histories should be internally coherent and visibly identified. A concise overall notice can establish context, but sensitive or decision-critical regions also benefit from local labels such as "sample review," "fictional provider," "sample estimate," "illustrative offer," "read-only preview" or "sample history." Exact wording is a product and content decision. The invariant is contextual truthfulness at the point where misunderstanding could affect a decision.

Provisional values need equally precise labels. Estimated, cached, stale, pending and confirmed are not interchangeable. If freshness is unknown, show that uncertainty rather than silently presenting an old value as current.

### Capability boundaries must be structural

Never imply a capability that the product does not have. If an interface cannot collect payment, submit a commitment, create a record, authenticate a user, send a communication or synchronize data, its controls, routes, labels and confirmations must all respect that boundary.

A truthful boundary may require all of the following:

- No integration that collects or transfers a value the product says it cannot collect.
- No alternate commitment method that contradicts the limitation.
- No submission mechanism or hidden endpoint.
- No newly created record that implies submission succeeded.
- No success surface that simulates a completed action.
- No alternate or direct route that bypasses the restriction.
- No reliance on a disabled final-action button as the only safeguard.

A disabled control alone is insufficient because surrounding copy, reachable routes or fabricated confirmation states may still communicate capability. Editing inputs and showing computed preview values can be valid without allowing a final commitment, but the endpoint must be explicit before the user mistakes preview for completion.

### Persistence and personal data must be described accurately

Session memory, browser storage, account storage, server persistence and cross-device synchronization are distinct promises. Same-browser persistence for a pending selection, saved collection, comparison or local history does not imply a shared account, cloud synchronization, cross-device availability or permanent storage.

When storage is blocked or persistence fails, distinguish what remains available in the current session from what will survive reload or return. Never conceal unavailable persistence with a success message. A reset that clears local state must describe the local consequence and request confirmation when the loss is meaningful. It must not imply that remote or account data was changed if it was not.

Fictional or read-only account content must not imply real authentication, personal-data collection, address or contact capture, account creation, live communications or writable history. Historical presentation data differs from a record supposedly created by the user's current action.

### Confirmation, arithmetic and dependent state must agree

Feedback is evidence about state, not decoration. A small reversible change can often be confirmed by the changed state itself. An uncertain or consequential operation needs explicit, durable outcome information. No single animation or feedback pattern is appropriate for every level of risk. 

Never show invented success. A confirmation must correspond to an accepted operation and, where claimed, a persisted result. If the outcome is unknown, say that it is unknown and provide safe recovery rather than choosing success or failure for visual neatness.

Computed values must be arithmetically consistent across detail, summary, badge and review surfaces. Quantities, selected options, base values, adjustments, conditional benefits and totals must reconcile. An optional region may fail independently when it does not alter the main task, but tightly coupled values cannot be excused as independent boxes. A quantity, rate and total that disagree make the whole task untrustworthy. 

### Disclose limitations where users encounter them

Place a limitation where it changes interpretation or action, not only in distant documentation. If content is fictional, label the content. If saving is session-only, explain that near the save state. If a review step is read-only, explain that where submission would normally occur. If an estimate is illustrative, label the estimate. An unobtrusive global notice can support these disclosures but should not carry the entire burden.

Do not use reassuring language, imagery or visual polish to suggest an operating reality that has not been established. A UI cannot create data rights, genuine inventory or availability, valid pricing, fulfillment capacity, refunds or cancellation processes, privacy and security practices, support operations or compliance with applicable obligations.

Legal, policy, safety, privacy, security, service-level and eligibility claims belong in the interface only when they describe real, sanctioned and maintainable practices. Sample policies must be labeled as samples. Visual confidence does not turn a fictional statement into an enforceable promise.

## 14. Measurement and evaluation

### HEART is a set of categories, not a universal score

Google's HEART framework separates five categories: [27]

- **Happiness:** satisfaction and perceived experience.
- **Engagement:** relevant interaction with the product.
- **Adoption:** initial use of a capability.
- **Retention:** return use over time.
- **Task Success:** the effectiveness and efficiency of completing a task.

The framework supports metric selection. It does not provide a one-size-fits-all score, and it does not imply that every category must become an analytics feature. Select measures that correspond to the product's actual goals, tasks and maturity.

### Define questions before treating observations as results

The following are potential evaluation questions and observations, **not collected results**:

| Evaluation question | Possible observation |
|---|---|
| Can the user find a relevant entity? | Task completion, wrong turns and requests for help |
| Are constraints, ranges and filters understandable? | Selection errors and interpretation of results |
| Is option behavior clear? | Correct choice and awareness of dependent value or availability changes |
| Is comparison useful? | Whether the user can accurately explain meaningful differences |
| Is a pending-selection summary understandable? | Whether the user can correctly explain and edit quantities, values and totals |
| Is the interaction satisfying? | Post-task confidence and qualitative response |
| Is the visual presentation appealing? | Separate feedback about visual appeal |
| Is the capability boundary clear? | Whether the user understands which actions and outcomes are real, unavailable, sample or read-only |

Task time, error count, requests for assistance and a simple confidence rating may be useful measures. Exact thresholds must not be presented as established until they have been defined and measured for the relevant context.

### Observe beyond the happy path

Evaluation should ask:

- Can a first-time user find and use search, filtering, comparison and the pending-selection area without explanation from the person who built it?
- After a click or tap, is the result understandable, or does uncertainty cause repeated activation?
- Is the difference between an empty saved collection and zero search results clear?
- Does validation lead the user to a correct input without losing entered values?
- When an optional region is slow or fails, does the main task remain meaningful?
- After rapid query changes, selection edits and Undo, does visible state remain coherent?
- Are essential information and actions available with a keyboard, touch, text zoom and reduced-motion settings?
- On an actual device, are there accidental taps, difficult reach, sticky-region overlap or interactions where scrolling triggers a click?
- Can the user explain what is saved, what is pending or unavailable and what is only sample data?

These are observation questions, not a record of completed tests or implemented analytics. Evaluating slow and failed conditions is useful. Adding an artificial delay to the normal user flow is not a substitute for that evaluation.

### Preserve distinctions between signals and outcomes

- "Looks polished" does not mean "easy to use."
- Adding an entity to a pending set does not prove intent to complete a later commitment.
- Completing a review preview does not equal conversion.
- Saving an entity does not establish retention.
- Showing local persistence does not measure real return behavior.
- A few guided stakeholder walkthroughs do not constitute a population-level experiment.
- High click volume does not establish satisfaction.

Small formative evaluations can reveal usability issues. They cannot, by themselves, estimate revenue uplift or another population-level outcome.

### Evaluate experiments as experiments

Microsoft's controlled-experiment research connects data quality problems, including sample ratio mismatch, to the trustworthiness of conclusions. Merely labeling a comparison "A/B" does not make it a valid experiment. [28]

Do not claim a controlled result unless a controlled experiment, appropriate traffic analysis, analytics instrumentation and measured comparison have actually been conducted. Where these are absent, describe proposed measures as hypotheses or evaluation plans, not findings.

In a real operating context, evaluate desired outcomes alongside guardrails. For a commercial flow, for example, relevant guardrails can include returns, refunds, complaints and opt-outs, not only sales. If evidence for such outcomes is unavailable, say so. More generally, pair a target metric with credible measures of harm, reversal, dissatisfaction and withdrawal that fit the product's domain.

### Combine quantitative and qualitative review

Quantitative measures can show frequency, duration, completion and error patterns. Qualitative observation can reveal why users hesitate, misinterpret a state, distrust a value or fail to recover. Visual-appeal feedback should remain separate from task success, confidence and recovery so that strength in one dimension does not conceal weakness in another.

Measurement should test the real interaction contract, including partial, stale, unavailable, invalid and unknown-outcome states. Passing one accessibility criterion or reaching one target metric does not establish whole-product usability. Standards can provide floors, while comfortable use still requires evaluation in the actual task and device context. 

## 15. UX review checklist

This checklist is for judging interface quality. It is not a task queue or build schedule.

### Find and decide

- [ ] Search, categories or groupings, filters, entity links and the pending-selection area are familiar and findable while the product retains an original identity.
- [ ] The genuinely available breadth is retained; useful grouping, narrowing and comparison make decisions manageable.
- [ ] Important differences, the selected option, key numeric values, sample or real availability and restrictions are clear.
- [ ] Secondary details are discoverable; essential facts are not buried in hidden panels.
- [ ] Returning from a detail view retains useful search, filter and position context.
- [ ] Recommendations explain their basis in real attributes, and users can edit the preferences or constraints that shaped them.

### Act and understand

- [ ] The interface acknowledges receipt of an action, and the visible result matches actual state.
- [ ] Loading, ready or successful, error, empty and relevant partial, stale or pending states are distinguishable.
- [ ] Default, focus, pressed, loading, unavailable and selected states agree in visual meaning and behavior.
- [ ] Validation is patient, specific and associated with its field; the reason for an unavailable control is understandable.
- [ ] Errors provide safe known information and a valid next action; important recovery remains available long enough to use.
- [ ] A small success receives subtle feedback; a larger consequence receives clearer confirmation; neither creates unnecessary interruption.
- [ ] Selected options, quantities or values, adjustments and totals remain coherent; Undo restores actual state.

### Wait and recover

- [ ] Ready results appear without unnecessary waiting.
- [ ] A skeleton, spinner or progress indicator matches the actual task; percentages and stages are genuine.
- [ ] Failure of an optional region does not destroy useful core content.
- [ ] Stale content, a session-only save or an unknown result is not presented as fresh, permanent or successfully completed.
- [ ] Retry, cancel and rapid interactions do not allow an older intent to override a newer one or discard existing choices.
- [ ] Empty first-use, no-match and cleared states provide a relevant explanation and next action.

### Use comfortably and trust

- [ ] Actual hit areas, spacing, stable layout and pointer cancellation reduce accidental activation.
- [ ] Keyboard operation, visible focus, assistive-technology status, touch, text zoom and reduced motion are supported.
- [ ] Essential actions are not hover-only; dialogs and sticky regions do not obscure focus or content.
- [ ] Locale-sensitive formats are consistent, and navigation adapts appropriately to device and input context.
- [ ] Fictional entities, commentary, providers, offers and estimates are clear; there is no fake urgency or invented endorsement.
- [ ] No collection, submission, newly created record, simulated success or bypass route exists for a capability the product says is unavailable.
- [ ] Task completion, confidence and recovery are judged separately from visual appeal.

**Decision rule:** If users must guess, repeat an action, perform unnecessary calculation or reconstruct lost context, reduce that burden without hiding consequences or removing control.

## 16. Evidence gaps and open questions

### Evidence coverage limits

- The original 28-source synthesis relied on excerpts and abstracts. Later work accessed selected full pages and document extracts, but every source was not reviewed in full text.
- Complete methods, sample bias, statistical detail and regulatory exceptions were not verified for every source.
- Some records remain search-level excerpts. Finding a source is not equivalent to reading all methods or verifying every interpretation.
- Indexed publication dates may not reflect the latest revision.
- Several original captures are landing pages, abstracts, bibliographic records or catalog metadata rather than complete primary texts.
- Multiple source categories may support a broad direction without constituting independent replications of a specific result. Repeated retellings of one study are not separate evidence.
- No live audit of peer products or current market interfaces was conducted. No claim about another organization's current internal algorithms, architecture, motives or interaction logic is supported without direct evidence.
- No target-audience interviews, usability study, interface evaluation or first-impression test was performed.
- No product analytics, performance measurement, real operational outcome or controlled conversion experiment was available.
- No legal review or accessibility certification was performed.
- Findings from one region, market, device generation, laboratory task or unrelated habit study do not establish applicability to another audience or product context.

### Claims that remain unresolved

- No primary comparative benchmark verified broad claims that automated interface generators omit important UX states.
- Missing source video and screenshots prevented direct review of cursor locations, pictured states and visual comparisons described in the transcript.
- Ambiguous names and phrases in the transcript could not always be recovered reliably. Unclear fragments were not silently completed.
- Some historical accounts of interface timing, animation chronology and internal processing remain unverified.
- Some attributed participant counts, percentages and original methods remain supported only by later institutional accounts because the full original method was not obtained.
- Early choice-reaction records were available only as an abstract or bibliographic entry, so their complete derivations were not claimed as fully verified.
- An exact quotation about complexity lacks edition, page or transcript provenance, and the related historical capture provides metadata rather than a full oral history.
- Older touch-target evidence is device-specific and sample-specific. It cannot certify current ergonomics across devices.
- Historical usage percentages are not current measurements. Promotional or case-specific improvement figures are not universal controlled results.
- Exact timing thresholds, marketing percentages and claims about causal mechanisms require provenance, denominators and conditions before use.

### Context-dependent product questions

The following choices cannot be settled universally:

- the intended audience and its relevant segments;
- the final identity and visual direction;
- type, color, density and motion decisions;
- the ideal number of recommendations, choices or visible objects;
- the appropriate information and operating model;
- whether a particular discovery, comparison, feedback or engagement hypothesis suits the intended audience;
- which states can safely remain independent and which must reconcile as one task;
- where a standards minimum is sufficient and where a more comfortable target is needed;
- which outcomes should be measured for the product's actual stage and capability.

These are recorded uncertainties, not questions being asked now and not a proposed next-work plan. They should prevent false certainty and indicate where claims depend on product context.

## 17. Source and evidence register

**Entries 1 to 28:** The access context for indexed excerpts and abstracts from the original research is preserved. These entries have not collectively been treated as full-text reviews. Where later guide research captured an overlapping source more thoroughly, its exact access record is available in a separate registry.

**Entries 29 onward:** These are selected supporting references for practical knowledge integrated into the guide. "Page/document capture" describes the retrieved material and does not mean that the full paper was accessed in every case. Abstract-level and search-level access are marked separately. The complete 66-URL registry used as research background for the guide is retained elsewhere and is not repeated in full here.

Original dates are preserved. Uncertain dates have not been given the status of new verification. Source-specific statistics below retain their original context. They are not expected results or design targets for any specific product.

### 1. The Aesthetic-Usability Effect: Nielsen Norman Group

- **Link:** [Original source][1]
- **Type/date:** Established UX guidance; publication/update date uncertain.
- **Knowledge retained:** Attractive interfaces can increase tolerance of minor usability issues and mask problems during evaluation.
- **Boundary:** Visual appeal is not proof of task success or a numerical conversion lift.

### 2. Can There Ever Be Too Many Options? A Meta-Analytic Review of Choice Overload

- **Link:** [Original source / repository record][2]
- **Type/date:** Academic meta-analysis; Scheibehenne, Greifeneder and Todd, 2010.
- **Knowledge retained:** 63 conditions from 50 experiments, N = 5,036; virtually zero average effect with substantial between-study variation.
- **Boundary:** Neither "more choice is always bad" nor "choice overload never occurs" follows.

### 3. Choice Overload: A Conceptual Review and Meta-Analysis

- **Link:** [Original source][3]
- **Type/date:** Academic meta-analysis; Chernev and colleagues, 2015.
- **Knowledge retained:** 99 observations, N = 7,202; choice complexity, task difficulty, preference uncertainty and decision goal moderate effects.
- **Additional excerpt detail:** Satisfaction/confidence, regret, choice deferral and switching likelihood were discussed as measures of overload in prior research.
- **Boundary:** Their reported comparability in that analysis is not permission to interchange all product metrics without validation.

### 4. E-Commerce Product Lists & Filtering UX: Baymard

- **Link:** [Original source][4]
- **Type/date:** Original UX research overview; date unconfirmed.
- **Knowledge retained:** Item lists, filtering and sorting form a connected discovery experience.
- **Source-specific numeric context:** The indexed excerpt reports 67 to 90% abandonment with mediocre product-list usability versus 17 to 33% with a somewhat optimized toolset in its study context, with an "up to four-fold" leads interpretation.
- **Boundary:** The full method and comparability were not verified. These figures are not forecasts, causal estimates or promised improvements for any specific product.

### 5. E-Commerce Search Query Types: Baymard

- **Link:** [Original source][5]
- **Type/date:** Original UX research article; indexed update 29 April 2026.
- **Knowledge retained:** Different query types matter. Poor search can cause frustrating refinement, wasted effort and abandonment.
- **Source-specific context:** The excerpt describes roughly half of test participants preferring search and half preferring navigation. The indexed headline references eight query types and issues on 56% of sites.
- **Boundary:** No complete eight-type taxonomy was retrieved. These shares are not established audience shares or benchmarks for any specific product.

### 6. Homepage & Navigation UX Best Practices: Baymard

- **Link:** [Original source][6]
- **Type/date:** UX benchmark/article; indexed date 30 September 2025.
- **Knowledge retained:** Homepage and category navigation present a substantive discovery problem separate from search.
- **Source-specific context:** The excerpt describes more than 16,000 benchmark scores, more than 13,000 examples and more than 180 US and European sites.
- **Boundary:** Regional benchmark coverage does not establish performance in other markets or provide a current audit of any named organization.

### 7. Self-Determination Theory and the Facilitation of Intrinsic Motivation, Social Development, and Well-Being

- **Link:** [Original source PDF][7]
- **Type/date:** Academic motivation research; Ryan and Deci, 2000.
- **Knowledge retained:** Support for autonomy and competence relates to intrinsic motivation. Intrinsic interest in the activity is an important qualification.
- **Boundary:** This was not a direct experiment on purchase, retention or revenue outcomes.

### 8. How Are Habits Formed: Modelling Habit Formation in the Real World

- **Link:** [Original source][8]
- **Type/date:** Academic study; Lally and colleagues, 2010.
- **Knowledge retained:** Repetition in response to everyday cues and automaticity were studied. The indexed method describes 101 initial attendees, 96 participants and a 12-week context.
- **Boundary:** Full results and methods were not reviewed. Everyday routines do not establish a universal timeline for forming habits in digital products.

### 9. How Gamification Motivates

- **Link:** [Original source][9]
- **Type/date:** Academic experiment; Sailer and colleagues, 2017.
- **Knowledge retained:** Different game elements affect different psychological needs. Perceived decision freedom did not change as intended in the excerpted finding.
- **Boundary:** This does not support a blanket conclusion that gamification works or a transferable estimate of conversion effects.

### 10. The Role of Animation and Motion in UX: Nielsen Norman Group

- **Link:** [Original source][10]
- **Type/date:** UX guidance; 29 January 2021.
- **Knowledge retained:** Brief, subtle motion can communicate feedback, state change, navigation and signifiers.
- **Boundary:** No universal animation duration or guaranteed satisfaction effect is established here.

### 11. Response Times: The Three Important Limits: Nielsen Norman Group

- **Link:** [Original source][11]
- **Type/date:** Foundational usability guidance; 1993.
- **Knowledge retained:** Rough 0.1-, 1- and 10-second distinctions describe immediate response, uninterrupted flow and attention.
- **Boundary:** These are historical heuristics, not universal modern performance criteria.

### 12. Product Page UX: Provide at Least One In-Scale Image: Baymard

- **Link:** [Original source][12]
- **Type/date:** Product UX research article; 30 May 2017.
- **Knowledge retained:** Contextual scale imagery supports understanding. Generated scale references are not equivalent to real in-scale photography.
- **Boundary:** Do not assume that every item in any specific product has unique, accurate photographic coverage.

### 13. Use Delivery Date, Not Shipping Speed: Baymard

- **Link:** [Original source][13]
- **Type/date:** Delivery/checkout UX research; indexed date 27 June 2023.
- **Knowledge retained:** Clear arrival dates reduce the need for people to calculate delivery from shipping-speed information.
- **Source-specific context:** The headline and excerpt report that 41% of sites failed to provide an estimated date in the referenced interface context.
- **Boundary:** The benchmark percentage is not a measured failure rate for any specific product. Any displayed date commitment must be truthful rather than fictional.

### 14. The Effect of Electronic Word of Mouth on Sales: A Meta-Analytic Review

- **Link:** [Original source][14]
- **Type/date:** Academic meta-analysis; 2016.
- **Knowledge retained:** 1,532 effect sizes from 96 studies across 40 platforms and 26 product categories; platform, product and metric differences matter.
- **Boundary:** The evidence provides no fixed review-to-sales multiplier and no justification for fabricated social proof.

### 15. Final Rule Banning Fake Reviews and Testimonials: FTC Announcement

- **Link:** [Original source][15]
- **Type/date:** US government rule announcement; 14 August 2024.
- **Knowledge retained:** Addresses fake reviews and testimonials, their sale and purchase, and enforcement against knowing violations.
- **Boundary:** This is US regulatory context. The full rule, exceptions and current applicability were not reviewed here.

### 16. WCAG 2.2 SC 2.5.8: Target Size (Minimum): W3C

- **Link:** [Understanding document][16]
- **Type/date:** Accessibility guidance; date unconfirmed.
- **Knowledge retained:** Level AA specifies a 24 × 24 CSS pixel minimum with exceptions, including spacing-related provisions.
- **Boundary:** An informative understanding page is not the complete normative standard or a certification.

### 17. WCAG SC 2.5.5: Target Size (Enhanced): W3C

- **Link:** [Understanding document][17]
- **Type/date:** Accessibility guidance; date unconfirmed.
- **Knowledge retained:** Enhanced Level AAA guidance uses 44 × 44 CSS pixels, subject to exceptions.
- **Boundary:** This is not interchangeable with AA minimum guidance.

### 18. WCAG SC 1.4.3: Contrast (Minimum): W3C

- **Link:** [Understanding document][18]
- **Type/date:** Accessibility guidance; date unconfirmed.
- **Knowledge retained:** The rationale for 4.5:1 contrast for standard text accommodates reduced visual contrast sensitivity.
- **Boundary:** The full criterion, large-text thresholds and exceptions require review of the original text.

### 19. WCAG SC 2.4.11: Focus Not Obscured (Minimum): W3C

- **Link:** [Understanding document][19]
- **Type/date:** Accessibility guidance; date unconfirmed.
- **Knowledge retained:** Focused components should not be completely hidden by author-created content. The minimum wording allows partial visibility.
- **Boundary:** The minimum criterion and fully unobscured enhanced behavior differ.

### 20. Technique C39: Using `prefers-reduced-motion`: W3C

- **Link:** [Technique][20]
- **Type/date:** Accessibility implementation guidance; date unconfirmed.
- **Knowledge retained:** System motion preferences can be respected using the CSS media query.
- **Boundary:** One technique does not establish the accessibility of an entire product.

### 21. Dark Commercial Patterns: OECD

- **Link:** [Original source][21]
- **Type/date:** Consumer-policy report; date unconfirmed from indexed evidence.
- **Knowledge retained:** Discusses prevalence, effectiveness, harms and responses to interfaces that deceive, coerce or manipulate choices.
- **Boundary:** Policy synthesis is not a specific interface experiment or a jurisdiction-independent legal rule.

### 22. Shining a Light on Dark Patterns

- **Link:** [Original source][22]
- **Type/date:** Academic/legal empirical research; Luguri and Strahilevitz, 2021.
- **Knowledge retained:** Manipulative interfaces changed sign-up behavior in a specific identity-theft-protection-service experiment.
- **Source-specific numeric context:** The excerpt reports mild patterns more than doubling sign-ups and aggressive patterns nearly quadrupling them. It also mentions prevalence estimates from other website and application studies.
- **Boundary:** These results do not establish effects on other conversion contexts, informed satisfaction or long-term value. Secondary prevalence claims were not independently checked.

### 23. Bringing Dark Patterns to Light: FTC Staff Report

- **Link:** [Original source PDF][23]
- **Type/date:** US government staff report; publication date not independently confirmed in the earlier register.
- **Knowledge retained:** Some patterns have consistently been found unlawful, while others require assessment of the surrounding facts.
- **Boundary:** This is not a complete legal interpretation or direct guidance for every jurisdiction.

### 24. Guidelines for Prevention and Regulation of Dark Patterns, 2023: CCPA / PIB

- **Link:** [Official announcement][24]
- **Type/date:** Indian government guidance announcement; 8 December 2023, referring to guidelines issued 30 November 2023.
- **Knowledge retained:** Identifies 13 specified dark patterns. The excerpt relates deceptive practices to unfair trade practices and names examples.
- **Boundary:** Full definitions, exceptions and applicability are not established by this excerpt alone.

### 25. E-Commerce Self-Audit Advisory on Dark Patterns: CCPA / PIB

- **Link:** [Official announcement][25]
- **Type/date:** Indian government advisory; 2025, exact release date unverified.
- **Knowledge retained:** The advisory calls for self-audits within three months, encourages self-declarations and avoidance of deceptive interfaces, and references enforcement notices.
- **Boundary:** This does not claim that any specific product has undergone such an audit or that this document determines current obligations.

### 26. Web Vitals: web.dev

- **Link:** [Technical guidance][26]
- **Type/date:** Authoritative web-performance guidance; indexed date 31 October 2024.
- **Knowledge retained:** LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the 75th percentile, segmented by mobile and desktop.
- **Boundary:** These are targets, not measured results or revenue forecasts.

### 27. Measuring the User Experience on a Large Scale: User-Centered Metrics for Web Applications

- **Link:** [Original source PDF][27]
- **Type/date:** Google Research; Rodden, Hutchinson and Fu, 2010.
- **Knowledge retained:** HEART categories support selecting goal-relevant UX metrics.
- **Boundary:** This establishes no universal score, required tracking implementation or validation of conversion for any specific product.

### 28. Diagnosing Sample Ratio Mismatch in Online Controlled Experiments

- **Link:** [Original source][28]
- **Type/date:** Microsoft Research / academic publication; July 2019.
- **Knowledge retained:** Experiment conclusions depend on trustworthy data. Sample-ratio mismatch can indicate data-quality problems.
- **Boundary:** This does not establish that an A/B experiment has been run. Stakeholder feedback is not equivalent to a controlled experiment.

### Additional practical references from the guide research

The reference numbers below belong to this document. Earlier research reports may use different numbering.

| Reference | Source and useful knowledge | Access in guide research |
|---|---|---|
| [29] | **Jakob's Law of Internet User Experience: NN/g.** Familiar expectations and recognizable interaction patterns. | Page capture |
| [30] | **Maintain Consistency and Adhere to Standards: NN/g.** Consistent meanings and established conventions. | Search excerpt |
| [31] | **On the Rate of Gain of Information: Hick, 1952.** Choice-response uncertainty, distinct from assortment decisions in commerce. | Abstract / landing-page capture |
| [32] | **When Choice is Demotivating: Iyengar and Lepper, 2000.** Contextual assortment, attraction and decision behavior. | Document extract |
| [33] | **Tesler's Theorem and other adages and coinages: Larry Tesler.** Allocation of irreducible complexity. | Page capture |
| [34] | **Progressive Disclosure: NN/g.** Defer advanced detail while keeping frequent actions findable; staged disclosure trade-offs. | Page capture |
| [35] | **The Information Capacity of the Human Motor System in Controlling the Amplitude of Movement: Fitts, 1954.** Target size, distance and movement accuracy. | Document extract |
| [36] | **Web Content Accessibility Guidelines 2.2: W3C.** Normative context for targets, pointer cancellation, contrast, keyboard and status requirements. | Standard page/document capture |
| [37] | **Error summary: GOV.UK Design System.** Linked summary, field-level errors and focus guidance. | Page capture |
| [38] | **Usability Testing of Inline Form Validation: Baymard.** Patient initial validation and timely correction feedback. | Page capture |
| [39] | **10 Design Guidelines for Reporting Errors in Forms: NN/g.** Helpful, understandable error presentation. | Search excerpt |
| [40] | **Error Handling Cheat Sheet: OWASP.** Safe user-facing errors without leaking internal diagnostics. | Search excerpt |
| [41] | **Understanding SC 4.1.3: Status Messages: W3C.** Programmatically available status without unnecessary focus changes. | Search excerpt |
| [42] | **ARIA: aria-disabled attribute: MDN.** Communicating unavailability does not itself suppress activation. | Search excerpt |
| [43] | **Button Pattern: WAI-ARIA Authoring Practices.** Action semantics and toggle-state meaning. | Search excerpt |
| [44] | **Developing a Keyboard Interface: WAI-ARIA Authoring Practices.** Deliberate keyboard and focus behavior. | Search excerpt |
| [45] | **Empty states pattern: Carbon Design System.** First-use, no-data, user-action and completed-state distinctions. | Page capture |
| [46] | **Progress Indicators Make a Slow System Less Insufferable: NN/g.** Waiting feedback and context-sensitive indicator choice. | Page capture |
| [47] | **Mobile Design Details: Avoid The Spinner: Luke Wroblewski, 2013.** Layout placeholders and a skeleton-screen usage example. | Page capture |
| [48] | **Progress indicators: Material Design 3.** Determinate and indeterminate progress patterns. | Search excerpt |
| [49] | **Progress indicators: Apple Human Interface Guidelines.** Meaningful progress communication. | Search excerpt |
| [50] | **The Labor Illusion: How Operational Transparency Increases Perceived Value: Buell and Norton, 2011.** Conditional effects of visible effort; the practical application here is honest explanation, not artificial delay. | Document extract |
| [51] | **RFC 5861: HTTP Cache-Control Extensions for Stale Content.** Bounded stale responses and background revalidation. | Document capture |
| [52] | **Graceful degradation: MDN.** Preserving useful core behavior when enhanced capability is unavailable. | Search excerpt |
| [53] | **useOptimistic documentation.** Temporary pre-confirmation interface state and result handling. | Documentation capture |
| [54] | **Optimistic Updates documentation.** Rollback, refetch and reconciliation patterns. | Search excerpt |
| [55] | **Target Size Study for One-Handed Thumb Use on Small Touchscreen Devices: Parhi, Karlson and Bederson, 2006.** Thumb-target research with device, grip and sample context. | Document extract |
| [56] | **Validating Input: W3C WAI.** Accessible validation assistance and the limits of validation performed on a user's device. | Search excerpt |
| [57] | **NIST SP 800-63B-4: Authentication and Authenticator Management.** Transparent password requirements and modern verifier guidance; background only, with no authentication requirement for any specific product. | Standard page/document capture |
| [58] | **Visibility of System Status: NN/g.** Timely, understandable feedback and clear outcome state. | Search excerpt |
| [59] | **Understanding SC 1.4.13: Content on Hover or Focus: W3C.** Dismissible, usable supplementary content and equivalent access. | Search excerpt |
| [60] | **Bottom navigation: Material Design.** Mobile navigation as a contextual design pattern. | Search excerpt |
| [61] | **Material Design Icons: RTL icons guidance.** Selective directional adaptation, not blind mirroring. | Search excerpt |
| [62] | **ISO 9241-210:2010 Ergonomics of human-system interaction.** Defines user experience broadly through perceptions, responses, behavior and accomplishments before, during and after use. | Search excerpt |
| [63] | **The Definition of User Experience (UX): NN/g, 1998.** User experience covers all aspects of a person's interaction with an organization, its services and its products. | Search excerpt |
| [64] | **Stimulus information as a determinant of reaction time: Hyman, 1953.** Bibliographic record confirming the 1953 paper behind the Hick-Hyman naming. | Search excerpt |
| [65] | **Hick's law for choice reaction time: A review, 2018.** Defines the law's choice-reaction scope and flags compatibility, practice, large-set and sequential-dependency limitations. | Abstract and metadata excerpt |
| [66] | **Alto System Project: Larry Tesler demonstration of Gypsy: Computer History Museum, 2017.** Credits Gypsy to Larry Tesler and Tim Mott and describes its cut-and-paste idiom as one of the earliest implementations, contradicting sole-inventor shorthand. | Search excerpt |
| [67] | **Tesler, Larry (Lawrence Gordon) oral history: Computer History Museum, 2013.** Catalog record covering Tesler's oral histories, Gypsy and the origins of cut, copy and paste; a catalog page, not a transcript passage. | Page capture |
| [68] | **Why Multi-Step Lead Forms Get up to 300% More Conversions: vendor case-study article.** Likely origin family for the "300%" claim; reports variable, context-specific case results rather than a general research effect. | Search excerpt |
| [69] | **NYT Highlights Myers' Role in Popularizing Progress Bars: Carnegie Mellon HCII, 2014.** Institutional retelling: 48 students tested, 86% liked the bars, and users tolerated inaccuracy rather than have no feedback; not the original experiment report. | Page capture |
| [70] | **The importance of percent-done progress indicators for computer-human interfaces: Myers, 1985.** Bibliographic confirmation of author, year, title and DOI only; no full paper text was captured. | Search excerpt |
| [71] | **Windows wait cursor: encyclopedia entry.** Supports an hourglass lineage through XP and a new animated cursor in Vista, not a claim that the cursor stayed static for twenty years. | Search excerpt |
| [72] | **Spinning pinwheel: encyclopedia entry.** Confirms the official term "spinning wait cursor" and the informal beachball name, not a precise 2001 introduction or invention claim. | Search excerpt |
| [73] | **The Netflix Recommender System: Algorithms, Business Value, and Innovation: ACM, 2015.** Company-authored article stating that recommendations influenced about 80% of hours streamed and search about 20%; a figure for one service, not a general law. | Document capture |
| [74] | **Hamburger Menus and Hidden Navigation Hurt UX Metrics: NN/g.** Hidden primary navigation reduces discoverability and worsens time and difficulty measures. | Search excerpt |
| [75] | **Improper Error Handling: OWASP.** Stack traces, database dumps, implementation details and internal codes must not be exposed to users. | Search excerpt |
| [76] | **Advanced error handling: Stripe documentation.** Timeouts and 5xx responses are ambiguous outcomes; same-key retries, idempotency and reconciliation resolve them. | Page capture |
| [77] | **The effect of skeleton screens: Users' perception of speed and ease of navigation: Mejtoft and colleagues, 2018.** Limited abstract evidence cautions against universal skeleton superiority; one first-entry finding favored a spinner. | Search excerpt |

Across these references, the practical synthesis is consistent: show understandable state, reduce avoidable effort, preserve meaningful information and support recovery. Documentation for specific implementation technologies illustrates behavior. It does not select a technology stack for any specific product.

## 18. Provenance and method

### Research lineage

This guide descends from three bodies of work:

1. An original UX research consolidation dated 6 September 2026, which indexed 28 sources and recorded evidence, conflicts, limitations, boundaries and practical interaction themes.
2. A practitioner UX guide transcript of about 5,900 words, comprising 21 substantive paragraphs across 81 logical lines, with all 60 blank separator lines accounted for. Its substantive claims were inventoried and adjudicated claim by claim against 66 unique source URLs. Those records comprised 22 retrieved page or document captures and 44 search-level records. A retrieved record was not assumed to be a complete paper: some captures contained only an abstract, landing page or metadata.
3. This universal English edition, dated 8 September 2026, which generalized an earlier edition written for a single product into domain-neutral guidance while retaining reusable findings, qualifications, evidence status and truth boundaries.

The two source sets overlap, so the 28 indexed sources and 66 adjudication URLs must not be added together and described as a unique-source total.

### Consolidation method

The practitioner transcript was read from beginning to end. Its ordering was preserved during analysis, including a final paragraph that referred back to earlier material. Missing visual demonstrations and ambiguous references were not claimed as observed. The analysis inventoried 194 substantive claims or ideas, but that count does not represent 194 independent scientific propositions. It includes practical suggestions, repeated ideas, illustrations, rhetorical statements and unclear claims.

Each claim was checked for meaning, evidence type, access quality, conflict and limitation. Academic findings, official standards, public design systems and practitioner guidance were not treated as interchangeable proof. A normative accessibility requirement was not presented as an experimentally proven business uplift. A vendor account was not treated as a universal law. Multiple descriptions of the same experiment were not counted as independent replications.

The resulting guidance integrates complete states, indicator selection, honest waiting, safe errors, all six form topic areas from the source analysis, feedback placement, empty, partial and stale states, proportional success feedback, device-aware conventions, manageable choice, progressive disclosure, allocation of complexity, control behavior, target sizing and reconciliation of optimistic changes. Historical anecdotes, unrelated implementation stories and numerical comparisons remain research context rather than rigid rules. Their transferable design lessons are retained without turning uncertain details into prescriptions.

Source records remain historical evidence. Earlier planning, priority and task language is not adopted as current direction. This edition did not create an implementation, conduct a new user study, measure performance, certify accessibility or enable any operational capability.

### How to interpret this edition

This file is readable as standalone guidance. Linked research files are not required to understand its recommendations, but the source and evidence register is necessary for auditing provenance and access status.

This file is guidance, not an implementation plan. It contains no task schedule, implementation commitment or claim of delivered functionality. Its central direction is to help people find relevant information, understand meaningful differences, make and revise confident choices, and recover from uncertain moments through fast, honest, accessible and reversible interaction. [58]

All source statistics are context rather than targets. Preserve their dates, methods, populations, denominators and caveats when applying them. Product decisions still require evaluation with the intended audience, actual content, real devices and operational conditions.

[1]: https://www.nngroup.com/articles/aesthetic-usability-effect/
[2]: https://edoc.unibas.ch/entities/publication/da0a49eb-c7ad-4178-986f-0b9787db5831
[3]: https://myscp.onlinelibrary.wiley.com/doi/abs/10.1016/j.jcps.2014.08.002
[4]: https://baymard.com/research/ecommerce-product-lists
[5]: https://baymard.com/blog/ecommerce-search-query-types
[6]: https://baymard.com/blog/ecommerce-navigation-best-practice
[7]: https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf
[8]: http://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674
[9]: https://www.sciencedirect.com/science/article/pii/S074756321630855X
[10]: https://www.nngroup.com/articles/animation-purpose-ux/
[11]: https://www.nngroup.com/articles/response-times-3-important-limits/
[12]: https://baymard.com/blog/in-scale-product-images
[13]: https://baymard.com/blog/shipping-speed-vs-delivery-date
[14]: https://journals.sagepub.com/doi/10.1509/jmr.14.0380
[15]: http://ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials
[16]: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
[17]: https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html
[18]: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
[19]: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
[20]: https://www.w3.org/WAI/WCAG22/Techniques/css/C39
[21]: https://www.oecd.org/en/publications/dark-commercial-patterns_44f5e846-en.html
[22]: http://academic.oup.com/jla/article/13/1/43/6180579
[23]: https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf
[24]: https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1983994
[25]: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2134765
[26]: https://web.dev/articles/vitals
[27]: https://research.google.com/pubs/archive/36299.pdf
[28]: https://www.microsoft.com/en-us/research/publication/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments-a-taxonomy-and-rules-of-thumb-for-practitioners
[29]: https://www.nngroup.com/videos/jakobs-law-internet-ux
[30]: https://www.nngroup.com/articles/consistency-and-standards
[31]: https://journals.sagepub.com/doi/10.1080/17470215208416600
[32]: https://faculty.washington.edu/jdb/345/345%20Articles/Iyengar%20&%20Lepper%20(2000).pdf
[33]: https://www.nomodes.com/larry-tesler-consulting/adages-and-coinages
[34]: https://www.nngroup.com/articles/progressive-disclosure
[35]: https://www.cs.princeton.edu/courses/archive/fall08/cos436/FittsJEP1954.pdf
[36]: https://www.w3.org/TR/WCAG22/
[37]: https://design-system.service.gov.uk/components/error-summary/
[38]: http://baymard.com/blog/inline-form-validation
[39]: https://www.nngroup.com/articles/errors-forms-design-guidelines
[40]: https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html
[41]: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
[42]: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled
[43]: https://www.w3.org/WAI/ARIA/apg/patterns/button
[44]: https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface
[45]: https://v10.carbondesignsystem.com/patterns/empty-states-pattern
[46]: https://www.nngroup.com/articles/progress-indicators/
[47]: https://www.lukew.com/ff/entry.asp?1797
[48]: https://m3.material.io/components/progress-indicators/guidelines
[49]: https://developer.apple.com/design/human-interface-guidelines/progress-indicators
[50]: https://www.hbs.edu/ris/Publication%20Files/Norton_Michael_The%20labor%20illusion%20How%20operational_f4269b70-3732-4fc4-8113-72d0c47533e0.pdf
[51]: https://datatracker.ietf.org/doc/html/rfc5861
[52]: https://developer.mozilla.org/en-US/docs/Glossary/Graceful_degradation
[53]: https://react.dev/reference/react/useOptimistic
[54]: https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates
[55]: https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/parhi-mobileHCI06.pdf
[56]: https://www.w3.org/WAI/tutorials/forms/validation
[57]: https://pages.nist.gov/800-63-4/sp800-63b.html
[58]: https://www.nngroup.com/articles/visibility-system-status
[59]: https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html
[60]: https://m2.material.io/components/bottom-navigation
[61]: https://fuchsia.googlesource.com/third_party/github.com/google/material-design-icons/+/728a1ca7b0c0b73b3b42ce736bbc224839e04312/index.html
[62]: https://www.iso.org/obp/ui#!iso:std:52075:en
[63]: https://www.nngroup.com/articles/definition-user-experience
[64]: https://www.semanticscholar.org/paper/Stimulus-information-as-a-determinant-of-reaction-Hyman/2d69465216148628336f4ae6de8e53a682b46da8
[65]: https://pubmed.ncbi.nlm.nih.gov/28434379
[66]: https://www.computerhistory.org/collections/catalog/102738551
[67]: https://www.computerhistory.org/collections/catalog/102746675
[68]: https://ventureharbour.com/multi-step-lead-forms-get-300-conversions
[69]: https://www.hcii.cmu.edu/news/nyt-highlights-myers-role-popularizing-progress-bars
[70]: https://www.semanticscholar.org/paper/The-importance-of-percent-done-progress-indicators-Myers/8fd762da2a6cbdf3a64b706b11ff9971f7f5eb7f
[71]: https://en.wikipedia.org/wiki/Windows_wait_cursor
[72]: https://en.wikipedia.org/wiki/Spinning_pinwheel
[73]: https://dl.acm.org/doi/pdf/10.1145/2843948
[74]: https://www.nngroup.com/articles/hamburger-menus
[75]: https://owasp.org/www-community/Improper_Error_Handling
[76]: https://docs.stripe.com/error-low-level
[77]: https://www.researchgate.net/publication/326858669_The_effect_of_skeleton_screens_Users'_perception_of_speed_and_ease_of_navigation
