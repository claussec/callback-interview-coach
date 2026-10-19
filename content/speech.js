/* Speech analysis: what counts as a filler word and which speaking pace reads as calm.
   speechStats() in index.html counts whole-word matches (case-insensitive) per language.
   Pace in words per minute: below lo sounds hesitant, above hi sounds rushed. */
const FILLERS={
  de:['äh','ähm','öh','öhm','hm','halt','eigentlich','sozusagen','quasi','irgendwie','also','genau','ja also','gewissermaßen'],
  en:['uh','um','erm','er','like','you know','basically','actually','sort of','kind of','i mean','literally','so yeah']
};
const PACE={lo:110,hi:165};

/* Video interview: one-way interviews as used by many large employers.
   Each question has prep and answer time in seconds. Sets are chosen by application goal
   (TRACKS id); "allgemein" is the fallback. */
const VIDEO_SETS={
  allgemein:{
    de:['Stellen Sie sich bitte kurz vor.','Warum möchten Sie bei uns arbeiten?','Erzählen Sie von einer Situation, in der Sie ein Problem selbstständig gelöst haben.','Was ist eine Schwäche, an der Sie arbeiten?','Wo sehen Sie sich in drei Jahren?'],
    en:['Please introduce yourself briefly.','Why do you want to work for us?','Tell us about a time you solved a problem on your own.','What is a weakness you are working on?','Where do you see yourself in three years?']
  },
  trainee:{
    de:['Stellen Sie sich bitte kurz vor.','Warum ein Traineeprogramm und nicht der Direkteinstieg?','Erzählen Sie von einem Projekt, bei dem Sie mit sehr unterschiedlichen Menschen zusammengearbeitet haben.','Beschreiben Sie eine Situation, in der Sie unter Zeitdruck eine Entscheidung treffen mussten.','Welche Station in unserem Programm reizt Sie am meisten und warum?'],
    en:['Please introduce yourself briefly.','Why a graduate programme rather than a direct entry role?','Tell us about a project where you worked with very different people.','Describe a time you had to make a decision under time pressure.','Which rotation in our programme interests you most, and why?']
  },
  beratung:{
    de:['Warum Beratung?','Erzählen Sie von einer Situation, in der Sie jemanden mit Zahlen überzeugt haben.','Beschreiben Sie Ihre größte Führungserfahrung.','Wie würden Sie abschätzen, wie viele E-Scooter es in Berlin gibt? Erklären Sie nur Ihr Vorgehen.','Was war Ihr größter Misserfolg, und was haben Sie daraus gelernt?'],
    en:['Why consulting?','Tell us about a time you convinced someone with numbers.','Describe your most significant leadership experience.','How would you estimate the number of e-scooters in Berlin? Explain only your approach.','What was your biggest failure, and what did you learn?']
  },
  finance:{
    de:['Warum Finance?','Erklären Sie in einfachen Worten, wie ein steigender Leitzins Unternehmensbewertungen beeinflusst.','Erzählen Sie von einer Analyse, auf die Sie stolz sind.','Beschreiben Sie einen Fehler, den Sie bei der Arbeit mit Zahlen gemacht haben.','Welche aktuelle Entwicklung an den Märkten verfolgen Sie gerade?'],
    en:['Why finance?','Explain in simple terms how a rising interest rate affects company valuations.','Tell us about an analysis you are proud of.','Describe a mistake you made when working with numbers.','Which current market development are you following right now?']
  }
};
const VIDEO_TIMING={prep:30,answers:[60,90,120],answer:90,count:3};
/* Video interview scorecard: rated by the AI from the transcript, or by the user after
   watching the recording when no AI is available. */
const VIDEO_CRIT=[['inhalt','Inhalt & Beispiele'],['struktur','Aufbau & Kernaussage'],['wirkung','Wirkung vor der Kamera'],['zeit','Zeiteinteilung']];
