/* Interview content: everything the AI interviewer and the scorecards are built from.
   Plain data, no logic. The app reads these objects by key, so adding an entry here
   adds it to the setup screens, the prompts and the feedback without touching app code.

   CASE_TYPES   case interview topics            {id, label, desc}
   LEVELS       difficulty for cases             {label, short, desc, ...}
   STYLES       who leads the case               {label, short, book, rule}
   TRACKS       application goals                {label, desc, sims:['fit:verhalten', ...]}
   FIT_ARTS     interview types                  {label, short, crit, rule}   rule = instructions for the AI
   AC_TYPES     assessment centre exercises      {label, skill, min, desc, steps, rule}
   *_CRIT       scoring rubrics                  [[id, label], ...]  each scored 1 to 5
   CRIT_DRILL   weakest criterion → short drill  {kind: {criterion: drillId}}
   FRAMEWORKS   case structures shown in lessons {name, root, branches}
*/
const CASE_TYPES=[
  {id:'zufall',label:'Zufall'},
  {id:'profit',label:'Profitabilität',desc:'Gewinn- oder Margenrückgang eines Kunden: Ursachen auf Umsatz- und Kostenseite finden und Maßnahmen empfehlen'},
  {id:'ops',label:'Einkauf & Operations',desc:'Operations-Case: Einkaufskosten senken, Lieferantenbasis optimieren, Produktions- oder Logistikkosten, Supply-Chain-Probleme'},
  {id:'markt',label:'Markteintritt',desc:'Soll der Kunde in einen neuen Markt, ein neues Land oder Segment eintreten? Marktattraktivität, Wettbewerb, eigene Fähigkeiten, Wirtschaftlichkeit, Eintrittsweg'},
  {id:'sizing',label:'Market Sizing',desc:'Marktgrößenschätzung als Kern des Cases (z. B. Markt für X in Deutschland) mit Herleitung, Annahmen, Plausibilitätscheck und einer anschließenden So-what-Frage'},
  {id:'pricing',label:'Pricing',desc:'Preissetzung für ein neues oder bestehendes Produkt: kosten-, wettbewerbs- und wertbasiert, Preis-Absatz-Effekte'},
  {id:'wachstum',label:'Wachstum',desc:'Wie kann der Kunde Umsatz oder Gewinn steigern? Organische und anorganische Hebel finden und priorisieren'},
  {id:'ma',label:'M&A',desc:'Soll der Kunde ein Unternehmen kaufen? Markt, Zielunternehmen, Synergien, Bewertung, Risiken'}
];
const INDUSTRIES=['Automobil & Zulieferer','Konsumgüter & Handel','Pharma & Gesundheit','Logistik & Transport','Energie & Chemie','Telekommunikation & Tech','Maschinenbau & Industrie','Banken & Versicherungen','Luftfahrt & Tourismus','Lebensmittel & Agrar'];
const LEVELS={
  einstieg:{label:'Einstieg',short:'klarer Fall, einfache Zahlen',desc:'klarer Fall, 2 Exhibits, einfache Rechnungen, wohlwollender Interviewer',synth:18,target:25},
  mittel:{label:'Interview-Niveau',short:'typische erste Runde',desc:'typischer Case einer ersten Runde, 2 bis 3 Exhibits, 2 bis 3 Rechnungen mit Prozenten und großen Zahlen',synth:24,target:30},
  schwer:{label:'Finalrunde',short:'mehrdeutig, mehrstufig',desc:'anspruchsvoll wie in einer Finalrunde: mehrdeutige Daten, mehrstufige Rechnungen, ein Exhibit mit ablenkenden Daten, kritische Nachfragen',synth:27,target:35}
};
const STYLES={
  coach:{label:'Lernmodus',short:'Coaching nach jeder Antwort',book:'Lernmodus für Einsteiger: der Interviewer führt Schritt für Schritt durch den Case und gibt nach jeder Antwort einen kurzen Coaching-Tipp',
    rule:'Lernmodus für Einsteiger: Du führst den Bewerber Schritt für Schritt durch den Case: Zusammenfassung und Klärung, Struktur, Analyse der Exhibits, Rechnung, Empfehlung. Sag nach jedem Schritt klar, was als Nächstes kommt (zum Beispiel "Als Nächstes: Wie würden Sie das Problem strukturieren?"). Stell einfache, eindeutige Fragen. Steckt der Bewerber fest, gib einen konkreten Anstoß.'},
  kandidat:{label:'Kandidatengeführt',short:'wie bei Kearney, BCG, Bain',book:'kandidatengeführt: der Kandidat führt durch den Case, der Interviewer reagiert nur',
    rule:'Kandidatengeführt (wie bei Kearney, BCG oder Bain): Der Bewerber führt durch den Case und entscheidet, was er analysiert. Du gibst keine Richtung vor. Fragt er, was er als Nächstes tun soll, gib die Frage zurück ("Wie würden Sie vorgehen?"). Erst wenn er zweimal hintereinander feststeckt, gibst du einen kleinen Anstoß.'},
  interviewer:{label:'Interviewergeführt',short:'wie bei McKinsey',book:'interviewergeführt: der Interviewer stellt nacheinander gezielte Fragen',
    rule:'Interviewergeführt (wie bei McKinsey): Du führst. Nachdem der Bewerber seine Struktur vorgestellt hat, stellst du nacheinander gezielte Fragen: zuerst ein Exhibit zur Analyse, dann die Rechenaufgaben, dann die Kreativfrage, zuletzt die Empfehlung.'}
};
const SPEEDS={quick:{label:'Schnell',short:'kurze Wartezeiten'},thorough:{label:'Gründlich',short:'stärkeres Modell, längere Pausen'}};
const LANGS={de:'Deutsch',en:'Englisch'};
const CASE_CRIT=[['klaerung','Problemverständnis & Klärung'],['struktur','Struktur'],['analyse','Analyse & Insights'],['rechnen','Rechnen'],['synthese','Empfehlung'],['kommunikation','Kommunikation & Führung']];
const FIT_CRIT=[['struktur','Aufbau & Prägnanz (STAR)'],['substanz','Konkretheit & Ergebnisse'],['motivation','Motivation & Firmen-Fit'],['wirkung','Wirkung & Authentizität']];
const PHASES=[['klaerung','Klärung'],['struktur','Struktur'],['analyse','Analyse'],['rechnung','Rechnung'],['synthese','Empfehlung']];
const VERDICT={weiter:{cls:'good',txt:'Nächste Runde: ja'},knapp:{cls:'warn',txt:'Grenzfall'},nein:{cls:'bad',txt:'Nächste Runde: nein'}};
const ANSWER_RATING={stark:{cls:'good',txt:'Stark'},solide:{cls:'neutral',txt:'Solide'},schwach:{cls:'bad',txt:'Schwach'}};

/* ---- application goals: what the start page, path and plan recommend ---- */
const TRACKS={
  allgemein:{label:'Berufseinstieg',desc:'Erster Job nach Studium oder Ausbildung: Unterlagen schärfen, Vorstellungsgespräch üben, heikle Fragen sicher beantworten.',sims:['fit:klassisch','fit:verhalten'],drills:['pitch','motivation','heikel','star'],lessons:'bewerbung',math:false},
  trainee:{label:'Traineeprogramm & Konzern',desc:'Mehrstufige Auswahl mit Online-Test, Interview und Assessment Center.',sims:['ac:gruppe','fit:verhalten','ac:praesentation'],drills:['pitch','star','motivation'],lessons:'bewerbung',math:true},
  beratung:{label:'Unternehmensberatung',desc:'Case-Interviews plus Fit-Fragen. Das komplette Case-Training mit Lernmodus, Exhibits und Kopfrechnen.',sims:['case','fit:verhalten'],drills:['struktur','exhibit','synthese','pitch'],lessons:'case',math:true},
  finance:{label:'Banking & Finance',desc:'Fachfragen zu Bewertung und Märkten, Verhaltensfragen und sicheres Rechnen.',sims:['fit:fach','fit:verhalten'],drills:['star','motivation','sizing'],lessons:'bewerbung',math:true},
  tech:{label:'Tech & Produkt',desc:'Produkt- und Fachfragen, Schätzaufgaben und Motivation für Rollen in Tech-Unternehmen und Start-ups.',sims:['fit:fach','fit:klassisch'],drills:['sizing','star','motivation'],lessons:'bewerbung',math:false},
  ausbildung:{label:'Ausbildung & duales Studium',desc:'Einstellungstest, Vorstellungsgespräch und die typischen Fragen an Schulabgänger.',sims:['fit:klassisch','ac:gruppe'],drills:['pitch','motivation','rueckfragen'],lessons:'bewerbung',math:true},
  wechsel:{label:'Jobwechsel mit Erfahrung',desc:'Wechselgründe überzeugend erklären, Erfolge belegen und das Gehalt verhandeln.',sims:['fit:klassisch','fit:gehalt'],drills:['heikel','star','rueckfragen'],lessons:'bewerbung',math:false}
};
const FIT_ARTS={
  klassisch:{label:'Vorstellungsgespräch',short:'HR und Fachbereich, 30 bis 45 Minuten',crit:'fit',
    rule:'Klassisches Vorstellungsgespräch mit jemandem aus HR und dem Fachbereich. Typischer Ablauf: kurze Begrüßung, Bitte um Selbstvorstellung, Fragen zu Motivation und Unternehmen, Fragen zu Stationen im Lebenslauf, Stärken und Entwicklungsfelder, eine Verhaltensfrage, zum Schluss die Frage, welche Fragen der Bewerber hat. Die Frage nach eigenen Fragen zählt als letzte Hauptfrage.'},
  verhalten:{label:'Verhaltensinterview',short:'Kompetenzfragen nach STAR',crit:'fit',
    rule:'Strukturiertes Verhaltensinterview (kompetenzbasiert): Fast alle Hauptfragen beginnen mit "Erzählen Sie von einer Situation, in der …" und zielen auf je eine Kompetenz (Teamarbeit, Konflikt, Misserfolg, Führung, Eigeninitiative, Arbeiten unter Druck). Du hakst konsequent nach dem eigenen Beitrag und dem Ergebnis nach.'},
  telefon:{label:'Telefoninterview',short:'erstes Screening, 15 Minuten',crit:'fit',
    rule:'Kurzes telefonisches Erstgespräch (Screening) mit Recruiting. Freundlich, aber zügig. Typische Fragen: kurze Selbstvorstellung, warum diese Stelle, Wechselmotivation oder Verfügbarkeit, eine Frage zu einer Station im Lebenslauf, Gehaltsvorstellung oder Rahmenbedingungen. Antworten sollen kurz und klar sein.'},
  fach:{label:'Fachinterview',short:'Fachfragen zur Stelle',crit:'fach',
    rule:'Fachinterview mit einer Führungskraft aus dem Fachbereich. Stelle Fachfragen, die sich aus der Stellenanzeige und dem Profil ergeben: Wissensfragen, Anwendungsfragen ("Wie würden Sie vorgehen, wenn …?") und eine kleine Praxisaufgabe, die man im Gespräch lösen kann. Passe das Niveau an die Stelle an. Weiß der Bewerber etwas nicht, beobachte, wie er damit umgeht.'},
  stress:{label:'Kritische Nachfragen',short:'Druck, Lücken, Widerspruch',crit:'fit',
    rule:'Anspruchsvolles Gespräch mit kritischem Gegenüber, aber nie unhöflich oder unfair. Du sprichst Schwachstellen im Lebenslauf direkt an (Lücken, Studienwechsel, schwache Noten, kurze Stationen), stellst Gegenfragen ("Warum sollten wir Sie und nicht jemanden mit mehr Erfahrung nehmen?") und hinterfragst Aussagen. Es geht darum, ob der Bewerber ruhig und souverän bleibt.'},
  gehalt:{label:'Gehaltsverhandlung',short:'Rollenspiel mit der Personalabteilung',crit:'gehalt',
    rule:'Gehaltsverhandlung am Ende des Auswahlprozesses. Du hast ein festes Budget (leg intern eine realistische Spanne für Stelle und Region fest, die etwa 5 bis 10 % unter der Zahl liegt, die ein gut vorbereiteter Bewerber nennen würde) und verhandelst freundlich, aber hart: erst nach der Gehaltsvorstellung fragen, dann Einwände ("Das liegt über unserem Rahmen", "Für Berufseinsteiger zahlen wir …"), Alternativen wie Bonus, Weiterbildung, Homeoffice oder ein früheres Review anbieten. Die Hauptfragen sind die Verhandlungsrunden.'}
};
const AC_TYPES={
  gruppe:{label:'Gruppendiskussion',skill:'Überzeugen im Team',min:20,desc:'Du diskutierst mit drei KI-Mitbewerbern einen Fall und sollt euch auf eine Lösung einigen.',
    steps:['Lies die Aufgabe und schlag früh ein Vorgehen vor (Ziel, Kriterien, Zeit).','Bring Argumente mit Begründung, geh auf andere ein und hol stille Teilnehmer ab.','Fass Zwischenstände zusammen und sorg dafür, dass am Ende eine Entscheidung steht.'],
    rule:'Gruppendiskussion im Assessment Center. Du spielst die Moderation und drei Mitbewerber: **Jana** (dominant, redet viel, unterbricht gern), **Tobias** (analytisch, zahlenorientiert, etwas stur) und **Mehmet** (zurückhaltend, hat aber gute Ideen, wenn man ihn fragt). Eröffne als Moderation in 2 bis 3 Sätzen mit einer realistischen Entscheidungsaufgabe (zum Beispiel: Budget auf Projekte verteilen, einen Standort wählen, eine Maßnahme priorisieren), gib 3 bis 5 Fakten mit Zahlen und 20 Minuten Zeit. Lass dann 1 bis 2 Mitbewerber kurz reagieren. In jeder weiteren Nachricht reagieren 1 bis 3 Mitbewerber auf den Bewerber und aufeinander, jeweils 1 bis 3 Sätze, in Fettdruck mit Namen davor (zum Beispiel **Jana:** …). Sie bleiben in ihren Rollen, sind nicht automatisch einverstanden und bringen eigene Vorschläge. Nach etwa 7 bis 9 Beiträgen des Bewerbers oder ab etwa 18 Minuten bittet die Moderation um das Ergebnis der Gruppe. Danach beendest du die Übung.'},
  rollenspiel:{label:'Mitarbeitergespräch',skill:'Führen und Klären',min:15,desc:'Du führst als Teamleitung ein schwieriges Gespräch mit einem Mitarbeiter, den die KI spielt.',
    steps:['Eröffne wertschätzend und nenn den Anlass konkret, mit Beispiel.','Frag nach seiner Sicht und hör zu, bevor du Lösungen anbietest.','Vereinbart ein konkretes Ziel mit Termin und sichere das Ergebnis.'],
    rule:'Rollenspiel im Assessment Center: Der Bewerber ist seit Kurzem Teamleitung. Du spielst **Herrn Krause**, einen erfahrenen Mitarbeiter, der seit einigen Wochen Termine reißt und im Team gereizt reagiert. Der Grund (erst auf gute Nachfrage hin erzählt): Er pflegt seit Kurzem seine Mutter und fühlt sich bei einer Beförderung übergangen. Eröffne mit einer kurzen Rollenbeschreibung für den Bewerber in kursiver Schrift (Situation, Ziel des Gesprächs, 15 Minuten), dann klopft Herr Krause an. Reagiere realistisch: zuerst abwehrend, bei Wertschätzung und guten Fragen offener, bei Vorwürfen gereizter. Nach etwa 8 Beiträgen des Bewerbers oder wenn eine Vereinbarung steht, beendest du das Gespräch freundlich.'},
  kunde:{label:'Kundengespräch',skill:'Verhandeln und Lösen',min:15,desc:'Ein verärgerter Kunde droht zu kündigen. Du sollst ihn halten, ohne alles zu verschenken.',
    steps:['Lass den Kunden ausreden und zeig Verständnis, ohne dich zu rechtfertigen.','Kläre mit Fragen, was genau schiefging und was er braucht.','Biete eine konkrete Lösung mit nächstem Schritt an und halte dein Budget ein.'],
    rule:'Rollenspiel im Assessment Center: Du spielst **Frau Albers**, Einkaufsleiterin eines wichtigen Geschäftskunden. Ihre letzte Lieferung kam zehn Tage zu spät, es gab Folgekosten, sie droht mit Kündigung des Rahmenvertrags. Der Bewerber ist Key-Account-Manager und darf maximal 5 % Rabatt auf die nächste Bestellung oder eine kostenlose Expresslieferung anbieten. Eröffne mit einer kurzen Rollenbeschreibung für den Bewerber in kursiver Schrift (Situation, Spielraum, 15 Minuten), dann ruft Frau Albers an. Sie ist verärgert, wird bei Verständnis und guten Fragen sachlicher, testet aber, ob er mehr gibt als erlaubt. Nach etwa 8 Beiträgen oder einer Einigung beendest du das Gespräch.'},
  praesentation:{label:'Präsentation',skill:'Auftreten und Argumentieren',min:15,desc:'Du bekommst ein Thema mit Fakten, stellst deine Empfehlung vor und beantwortest Fragen der Jury.',
    steps:['Antwort zuerst: Was empfiehlst du in einem Satz?','Begründe mit zwei bis drei Argumenten und Zahlen aus der Aufgabe, nenne ein Risiko.','Bei Jury-Fragen: kurz bestätigen, antworten, zurück zur Empfehlung.'],
    rule:'Präsentationsübung im Assessment Center. Du bist die Jury (zwei Führungskräfte). Gib in der ersten Nachricht ein Thema aus dem Unternehmensalltag mit einer Entscheidungsfrage und 4 bis 6 Fakten mit Zahlen (als Liste) und sag: "Sie haben jetzt Zeit zur Vorbereitung. Wenn Sie so weit sind, halten Sie Ihre Präsentation von etwa 5 Minuten." Nach der Präsentation stellst du nacheinander 3 kritische Fragen (Annahmen, Risiken, Umsetzung), je eine pro Nachricht, und beendest die Übung danach.'},
  postkorb:{label:'Postkorb',skill:'Priorisieren',min:20,desc:'Acht Mails und Notizen, wenig Zeit: Du priorisierst, delegierst und entscheidest.',
    steps:['Lies alles einmal quer, bevor du entscheidest.','Sortiere nach dringend und wichtig, erkenne Abhängigkeiten und Konflikte.','Sag pro Punkt, was du tust: selbst erledigen, delegieren an wen, terminieren oder streichen, mit kurzer Begründung.'],
    rule:'Postkorbübung im Assessment Center. Gib in der ersten Nachricht eine Situation (zum Beispiel: Sie vertreten ab heute Ihre Chefin, es ist Montag 8 Uhr, um 10 Uhr fliegen Sie für zwei Tage zu einem Kunden) und 8 nummerierte, kurze Vorgänge als Liste (Mails, Notizen, Anrufe) mit Absender und Inhalt. Darunter verstecken sich: 2 wirklich dringende Dinge, ein Terminkonflikt, eine Sache, die delegiert werden sollte, eine Falle (scheinbar dringend, aber unwichtig) und ein Vorgang, der mit einem anderen zusammenhängt. Bitte den Bewerber, für jeden Vorgang Priorität und Maßnahme mit Begründung anzugeben. Danach stellst du als zurückgekehrte Chefin 2 Nachfragen zu seinen Entscheidungen, je eine pro Nachricht, und beendest die Übung.'}
};
const GEHALT_CRIT=[['vorbereitung','Marktwert & Zielzahl'],['argumente','Argumente & Nutzen'],['taktik','Verhandlungstaktik'],['wirkung','Souveränität']];
const FACH_CRIT=[['fachwissen','Fachwissen'],['anwendung','Anwendung & Beispiele'],['struktur','Struktur & Klarheit'],['luecken','Umgang mit Wissenslücken']];
const AC_CRIT=[['kommunikation','Kommunikation & Wirkung'],['struktur','Struktur & Zielorientierung'],['sozial','Soziale Kompetenz'],['loesung','Lösungsqualität']];
const DOCS_CRIT=[['passung','Passung zur Stelle'],['eindruck','Erster Eindruck & Klarheit'],['belege','Belege & Ergebnisse'],['anschreiben','Anschreiben']];

const CRIT_DRILL={
  case:{klaerung:'klaerung',struktur:'struktur',analyse:'exhibit',rechnen:'math',synthese:'synthese',kommunikation:'kommunikation'},
  fit:{struktur:'star',substanz:'star',motivation:'motivation',wirkung:'pitch',vorbereitung:'heikel',argumente:'motivation',taktik:'heikel',fachwissen:'star',anwendung:'star',luecken:'heikel'},
  ac:{kommunikation:'pitch',struktur:'synthese',sozial:'star',loesung:'synthese'}
};
const KIND_LABEL={case:'Case',fit:'Interview',ac:'Assessment Center',drill:'Übung',math:'Test',docs:'Unterlagen',video:'Video-Interview'};

const FRAMEWORKS={
  profit:{name:'Profitabilität',root:'Warum sinkt der Gewinn, und was tun?',branches:[['Umsatz','Preis: Listenpreis, Rabatte, Mix','Menge: Marktgröße × Marktanteil','nach Produkten, Kunden, Regionen, Kanälen'],['Kosten','variable Kosten: Material, Logistik, Provisionen','Fixkosten: Personal, Miete, IT','Kosten pro Stück im Vergleich zum Wettbewerb'],['Vergleich','Entwicklung über die Zeit','Markt und Wettbewerber als Maßstab','interne oder externe Ursache?']],tip:'Erst klären, ob das Problem im Umsatz oder in den Kosten liegt, dann tiefer bohren. Immer mit dem Markt vergleichen.'},
  ops:{name:'Einkauf & Operations',root:'Wie senkt der Kunde seine Kosten?',branches:[['Ausgaben verstehen','Volumen nach Warengruppe und Lieferant','größte Hebel nach Volumen und Einfluss'],['Preis','bündeln und neu ausschreiben','neu verhandeln, Indexklauseln','Beschaffung aus günstigeren Ländern'],['Menge & Spezifikation','Bedarf senken','Spezifikation vereinfachen, Gleichteile'],['Prozess & Lieferkette','Lieferanten konsolidieren','Lager, Transport, selbst machen oder zukaufen']],tip:'Einkaufs-Cases starten fast immer mit der Frage: Wohin fließt das meiste Geld, und wo ist es zersplittert?'},
  markt:{name:'Markteintritt',root:'Soll der Kunde in Markt X eintreten?',branches:[['Markt','Größe und Wachstum','Profitabilität im Markt','Kundensegmente und Bedürfnisse'],['Wettbewerb','wichtigste Anbieter und Marktanteile','Eintrittsbarrieren','Reaktion der Konkurrenz'],['Kunde & Fähigkeiten','passt es zur Strategie?','Fähigkeiten, Marke, Vertriebskanäle'],['Wirtschaftlichkeit & Eintrittsweg','Investition, Break-even, Amortisation','selbst aufbauen, Partner oder Übernahme','Risiken']],tip:'Am Ende eine klare Ja-oder-Nein-Empfehlung geben, mit den Bedingungen dafür.'},
  sizing:{name:'Market Sizing',root:'Wie groß ist der Markt für X?',branches:[['Ansatz wählen','Nachfrage: Bevölkerung → Zielgruppe → Nutzung → Preis','Angebot: Anbieter × Kapazität × Auslastung'],['Annahmen','runde, begründete Zahlen','Segmente bilden, z. B. Alter oder privat/gewerblich'],['Rechnen','Schritt für Schritt, Einheiten mitschreiben','Zwischenergebnisse runden'],['Plausibilität','mit zweitem Ansatz oder bekannter Zahl prüfen','So what: Was heißt das für den Kunden?']],tip:'Deutschland: rund 84 Mio. Einwohner und etwa 41 Mio. Haushalte. Die Lebenserwartung kannst du mit rund 80 Jahren ansetzen.'},
  pricing:{name:'Pricing',root:'Welchen Preis soll der Kunde verlangen?',branches:[['Kosten','Untergrenze: variable Stückkosten','Break-even bei verschiedenen Preisen'],['Wettbewerb','Preise vergleichbarer Produkte','Positionierung: Premium oder günstig?'],['Kundennutzen','Zahlungsbereitschaft','Wert im Vergleich zur Alternative'],['Wirkung','Preis-Absatz-Effekt','Kannibalisierung eigener Produkte','Reaktion der Konkurrenz']],tip:'Die Kosten geben die Untergrenze vor, der Kundennutzen die Obergrenze, der Wettbewerb die Orientierung.'},
  wachstum:{name:'Wachstum',root:'Wie kann der Kunde wachsen?',branches:[['Bestehendes Geschäft','mehr Kunden','mehr Umsatz pro Kunde: Preis, Zusatzverkäufe','Kunden halten'],['Neue Produkte','eigene Entwicklung','Sortiment erweitern'],['Neue Märkte','neue Regionen','neue Kundensegmente oder Kanäle'],['Anorganisch','Übernahmen','Partnerschaften, Joint Ventures']],tip:'Hebel nicht nur sammeln, sondern nach Wirkung und Machbarkeit priorisieren.'},
  ma:{name:'M&A',root:'Soll der Kunde Unternehmen Y kaufen?',branches:[['Markt','Attraktivität, Wachstum, Trends'],['Zielunternehmen','Finanzen und Marktposition','Management und Kultur'],['Synergien','Umsatz: Zusatzverkäufe, neue Kunden','Kosten: Einkauf, Verwaltung, Standorte'],['Preis & Risiken','Bewertung und Kaufpreis','Risiken bei der Integration','Alternativen: selbst aufbauen, Partnerschaft']],tip:'Entscheidend ist, ob Synergien und Wachstum den Kaufpreis rechtfertigen.'}
};
