# Soccer Goalkeeper Performance Tracker

## Features

- **New Game Setup**: Start a new game by entering the event name, date, and game details, then choose to track Home Only, Away Only, or Both keepers
- **Keeper Info**: Enter each goalkeeper's name, year, and team name
- **1st & 2nd Half Stats**: Track Saves and Goals Against with tap-to-increment/decrement counters; Save % auto-calculates from those numbers
- **Distribution Stats**: Track Handled Crosses/Interceptions, Punts, Throwouts, and Drives with the same +/- counters
- **Away Keeper Section**: If "Both" or "Away Only" is selected, a matching stats section appears for the away keeper
- **Prior Games**: All completed games are saved persistently and listed in a "Prior Games" section with expandable cards showing full stats
- **Export**: Share any saved game as plain text or CSV via the device share sheet (works for text/email/messaging apps)

## Design

- **Dark theme** with a deep charcoal/near-black background evoking a night match atmosphere
- **Green accents** (emerald/pitch green) for buttons, active counters, and highlights
- Stat counters styled as bold, glowing number displays with circular minus/plus buttons on each side
- Save % displayed as a prominent highlighted badge that updates live
- Keeper sections separated by a subtle divider with "HOME" / "AWAY" labels in bold uppercase
- Prior Games cards with a dark card surface, green left border accent, and expandable accordion to reveal full stats
- Clean sans-serif typography with high contrast for readability on the sideline

## Screens

- **Home Screen**: Shows a prominent "New Game" button and a scrollable "Prior Games" list below it
- **New Game Screen**: Form fields for event, date, game name, and a selector for Home / Away / Both keepers
- **Game Tracking Screen**: The main stats entry screen — keeper info at top, then 1st Half and 2nd Half stat sections with counters, distribution stats below, and a "Save Game" button at the bottom. If both keepers selected, a tab or scroll separates them.
- **Game Detail Screen**: Opened from Prior Games — shows the full saved stats for a completed game with an export/share button

## App Icon

- Dark green gradient background with a stylized goalkeeper glove silhouette in white/light green, clean and sporty
