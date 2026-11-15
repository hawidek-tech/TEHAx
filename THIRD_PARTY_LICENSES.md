# Third-party software and licences

Versions are those installed in this repository (2026-11-15). Licences were read from each package's own metadata
(`package.json` / Maven POM). No paid or proprietary runtime dependency is required.

## Runtime — frontend (shipped to browsers)
| Package | Version | Licence |
|---|---|---|
| react, react-dom | 19.3.1 | MIT |
| react-router | 7.18.5 | MIT |
| i18next | 27.1.1 | MIT |
| react-i18next | 18.0.1 | MIT |
| lucide-react (icons) | 1.73.0 | ISC |
| Noto Sans Ethiopic font (@fontsource/noto-sans-ethiopic) | 5.3.0 | SIL Open Font License 1.1 |

## Runtime — backend
| Package | Version | Licence |
|---|---|---|
| Spring Boot / Spring Framework / Spring Security | 3.5.16 | Apache-2.0 |
| Hibernate ORM | 6.6.53.Final | LGPL-2.1-or-later (used unmodified as a library) |
| Flyway (core, PostgreSQL) | 11.7.2 | Apache-2.0 |
| PostgreSQL JDBC driver | 42.7.11 | BSD-2-Clause |
| springdoc-openapi | 2.8.17 | Apache-2.0 |
| Apache Tika (core) | 3.3.3 | Apache-2.0 |
| Bouncy Castle (bcprov-jdk18on) | 1.87 | Bouncy Castle Licence (MIT-style) |
| Anthropic Java SDK (optional AI assistant) | 3.8.0 | Apache-2.0 |
| PostgreSQL server | 16 | PostgreSQL Licence |

## Development and testing only (not shipped)
| Package | Version | Licence |
|---|---|---|
| Vite | 8.3.8 | MIT |
| TypeScript | 7.0.2 | Apache-2.0 |
| Tailwind CSS (+ @tailwindcss/vite) | 4.3.5 | MIT (compiled into the CSS) |
| Vitest, @testing-library/react, jsdom | 5.1.0 / 16.3.3 / 31.0.1 | MIT |
| Playwright | 1.65.1 | Apache-2.0 |
| axe-core / @axe-core/playwright | 4.x / 4.14.0 | MPL-2.0 |
| oxlint, Prettier | 1.93.0 / 3.10.1 | MIT |
| JUnit 5, Mockito, AssertJ (via spring-boot-starter-test) | — | EPL-2.0 / MIT / Apache-2.0 |

## Included third-party content
| Content | Source | Licence |
|---|---|---|
| `savanna/` (Savanna static pages, unmodified) | https://github.com/alx-africa/Savanna-static-pages @ `9e83ac7` | **Not stated in the repository.** Provided by ALX for the hackathon; used only as a demonstration host. Its bundled Bootstrap/Popper are MIT. |

## External services (optional, off by default)
| Service | Used for | When |
|---|---|---|
| Anthropic API (Claude) | AI help answers | Only if `ANTHROPIC_API_KEY` is set **and** the user ticks consent for that question |
| Browser speech services (e.g. Google, for Chrome speech recognition) | Voice input | Only when the user presses "Speak your answer" after a disclosure; provided by the user's browser, not ACCESSFLOW |
