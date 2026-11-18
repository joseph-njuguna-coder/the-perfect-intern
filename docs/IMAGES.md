# Photos and imagery

## Where they are used
| Photo (file name in `client/public/images`) | Used on |
|---|---|
| `student-laptop` | Home hero (students), Register (intern) |
| `hiring-manager` | Home hero (companies), For Companies, Register (company) |
| `professional-tablet` | Home "For companies" panel, For Companies page |
| `campus-entrance` | Home "For interns" panel, How It Works |
| `reading-break`, `classmates`, `focus-work` | Home "Made for every learner" mosaic; `classmates` also on About; `focus-work` on Resources |
| `phone-call` | Login page, About page |

Each photo exists as responsive WebP files (400 px and full width). `client/src/images.js` lists every photo with its size, alt text and focal point. To swap a photo, replace its two `-NNN.webp` files (keep the names), or add a new entry and use `<Img name="..." />`.

## Licensing: please read before launch
- `istockphoto-1167863776-612x612.jpg` (**classmates**) and `istockphoto-1190138820-612x612.jpg` (**professional-tablet**) are 612 px iStock preview files. iStock preview images are for evaluating a design, and using them on a live site normally requires buying a licence for that image. Buy the licences, or replace these two photos with licensed or free ones, before the site goes public.
- The other six look like Unsplash and Pexels images, which are free to use under those sites' licences. Check each photo's page for its current terms, and consider crediting the photographers.
- The photos are stock images of models. Do not present them as real interns, clients or testimonials (the site does not).

## Sharpness
The photos are small (600 to 870 px wide). They look fine at the sizes used on phones and tablets but can look soft on large desktop screens. For best results, download the original high-resolution versions (or buy the full-size iStock files) and re-run the image step: place them in the project and regenerate the WebP sizes (the script used is described in `docs/PHASES.md`, Branding and imagery update).

## Motion
The home hero alternates between "Find Internships" and "Post an Internship": the active button lights up with a progress line, the description slides across to the other audience, the photo crossfades, and a notch follows the active button. It pauses on hover or keyboard focus, has a visible Pause button and manual Students/Companies buttons, and does not auto-play for people who have "reduce motion" turned on. Sections fade up as they scroll into view, and photos drift slowly (also disabled for reduced motion).
