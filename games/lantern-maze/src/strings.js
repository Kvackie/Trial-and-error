import { makeT } from '../../../shared/i18n.js';

export const tr = makeT({
  en: {
    level: 'Level {level}',
    checkpointBanner: 'Level {level}\nCheckpoint',
    deepest: 'Deepest {level}',
    reset: 'Reset',
    resetTitle: 'Start over?',
    resetMessage: 'This clears every checkpoint and your deepest level, and sends you back to level 1.',
    lanternOut: 'Your lantern went out',
    backToStart: 'Back to the beginning',
    backToCheckpoint: 'Back to the checkpoint at level {level}',
    continue: 'Tap or press Space to continue',
    chest: 'A locked chest bars the way',
  },
  sv: {
    level: 'Nivå {level}',
    checkpointBanner: 'Nivå {level}\nKontrollpunkt',
    deepest: 'Djupast {level}',
    reset: 'Börja om',
    resetTitle: 'Börja om?',
    resetMessage: 'Det här rensar alla kontrollpunkter och din djupaste nivå, och skickar dig tillbaka till nivå 1.',
    lanternOut: 'Din lykta slocknade',
    backToStart: 'Tillbaka till början',
    backToCheckpoint: 'Tillbaka till kontrollpunkten på nivå {level}',
    continue: 'Tryck på skärmen eller mellanslag för att fortsätta',
    chest: 'En låst kista spärrar vägen',
  },
});
