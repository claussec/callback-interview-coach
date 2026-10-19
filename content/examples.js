/* Recorded example case interview (German and English). Shown as a worked example
   and replayed in demo mode when no AI is available. Each turn: {who:'int'|'cand', text, note?}. */
const EXAMPLE_CASE=[
  {who:'int',text:'Unser Kunde RadWerk betreibt 50 Fahrradgeschäfte in Deutschland. Der Gewinn ist in den letzten zwei Jahren von 10 auf 6 Mio. € gefallen. Der CEO möchte wissen, woran das liegt und was er tun soll. Wie würden Sie vorgehen?'},
  {who:'cand',text:'Ich fasse kurz zusammen: Der Gewinn ist in zwei Jahren um 40 % gesunken, und wir sollen die Ursachen finden und Maßnahmen empfehlen. Zwei Fragen vorab: Wie hat sich der Gesamtmarkt entwickelt? Und gibt es ein Ziel, bis wann der Gewinn wieder steigen soll?',note:'Zusammenfassung mit Zahl, danach nur zwei Fragen, die die Analyse wirklich verändern: der Markt als Vergleich und das Ziel.'},
  {who:'int',text:'Der Markt ist in der Zeit jedes Jahr leicht gewachsen. Ziel ist, in zwei Jahren wieder bei 10 Mio. € zu liegen.'},
  {who:'cand',text:'Danke. Darf ich mir eine Minute nehmen, um meine Gedanken zu ordnen?\n\nIch würde den Gewinn in Umsatz und Kosten aufteilen. Beim Umsatz schaue ich auf Preis und Menge, getrennt nach Segmenten: klassische Räder, E-Bikes und Werkstatt. Bei den Kosten trenne ich variable Kosten wie den Einkauf von fixen Kosten wie Miete und Personal.\n\nDa der Markt wächst, wir aber Gewinn verlieren, vermute ich ein Problem bei RadWerk selbst, eher bei den Margen als bei der Nachfrage. Ich würde deshalb mit Umsatz und Marge nach Segment beginnen.',note:'Überschneidungsfreie Struktur (Umsatz und Kosten, Preis und Menge), auf den Fall zugeschnitten (Segmente), eine klare Hypothese und ein Vorschlag, womit er anfängt.'},
  {who:'int',text:'Gut. Hier sind die Zahlen.\n\n**Exhibit 1: Umsatz und Marge nach Segment**\n\n| Segment | Umsatz vor 2 J. | Umsatz heute | Marge vor 2 J. | Marge heute |\n|---|---:|---:|---:|---:|\n| Klassische Räder | 100 Mio. € | 60 Mio. € | 6 % | 6 % |\n| E-Bikes | 40 Mio. € | 80 Mio. € | 5 % | 0,5 % |\n| Werkstatt | 20 Mio. € | 20 Mio. € | 10 % | 10 % |\n\nWas fällt Ihnen auf?'},
  {who:'cand',text:'Drei Dinge. Erstens: Der Umsatz ist mit 160 Mio. € gleich geblieben, obwohl der Markt wächst. Zweitens: Der Mix hat sich verschoben. E-Bikes haben sich auf 80 Mio. € verdoppelt, klassische Räder sind um 40 % gefallen. Drittens, und das ist das Wichtigste: Die E-Bike-Marge ist von 5 % auf 0,5 % eingebrochen. Bei der alten Marge hätten E-Bikes heute 4 Mio. € statt 0,4 Mio. € Gewinn gebracht, also 3,6 Mio. € mehr.\n\nDas heißt: Der Margenverfall bei E-Bikes ist der größte Hebel. Als Nächstes würde ich verstehen, warum. Liegt es an den Einkaufspreisen, an Rabatten oder an beidem?',note:'Er beschreibt nicht jede Zahl, sondern nennt die drei wichtigsten Beobachtungen, rechnet eine entscheidende Zahl aus, zieht ein Zwischenfazit und schlägt den nächsten Schritt vor.'},
  {who:'int',text:'Der Einkaufspreis pro E-Bike ist in zwei Jahren um 20 % gestiegen, vor allem wegen teurerer Akkus. RadWerk hat die Verkaufspreise nicht angepasst und gibt wegen der Konkurrenz hohe Rabatte. Eine kurze Rechnung: Ein E-Bike kostet bei RadWerk im Schnitt 2.500 €. Wie viele E-Bikes verkauft RadWerk heute pro Jahr?'},
  {who:'cand',text:'80 Mio. € geteilt durch 2.500 €. Ich kürze: 80.000.000 ÷ 2.500 = 80.000 ÷ 2,5 = 32.000 E-Bikes pro Jahr.\n\nKurzer Check: Das sind bei 50 Filialen 640 E-Bikes pro Filiale, also gut 12 pro Woche. Das klingt plausibel.',note:'Rechenweg laut, Nullen sauber gekürzt, Ergebnis mit Einheit und ein schneller Plausibilitätscheck.'},
  {who:'int',text:'Der CEO kommt gleich in den Raum. Was empfehlen Sie ihm?'},
  {who:'cand',text:'Meine Empfehlung: RadWerk sollte die Marge im E-Bike-Geschäft zurückholen, statt weiter über Rabatte Menge zu kaufen. Drei Gründe:\n\n1. Der Margenverfall bei E-Bikes kostet allein 3,6 Mio. € Gewinn.\n2. Die Einkaufspreise sind um 20 % gestiegen, die Verkaufspreise aber nicht.\n3. E-Bikes sind mit 80 Mio. € inzwischen das größte Segment. Hier bringt jeder Prozentpunkt Marge 0,8 Mio. €.\n\nKonkret: den Einkauf bündeln und mit den Akku-Lieferanten neu verhandeln, Rabatte begrenzen und Preise gezielt anheben. Risiko: Wir verlieren Kunden an Wettbewerber mit Rabatten. Nächste Schritte: die Preissensibilität in einigen Filialen testen und die Verhandlungen mit den drei größten Lieferanten starten.',note:'Antwort zuerst, drei Gründe mit Zahlen aus dem Case, konkrete Maßnahmen, ein Risiko und nächste Schritte. Kein Nacherzählen des Cases.'}
];
const EXAMPLE_CASE_EN=[
  {who:'int',text:'Our client RadWerk runs 50 bike shops in Germany. Profit has fallen from €10m to €6m over the last two years. The CEO wants to know why and what to do. How would you approach this?'},
  {who:'cand',text:'Let me recap: profit has dropped by 40% in two years, and we need to find the causes and recommend measures. Two questions first: how has the overall market developed? And is there a target for when profit should recover?',note:'A recap with a number, then only two questions that really change the analysis: the market as a benchmark and the target.'},
  {who:'int',text:'The market grew slightly every year over that period. The goal is to be back at €10m within two years.'},
  {who:'cand',text:'Thanks. May I take a minute to structure my thoughts?\n\nI would split profit into revenue and costs. On revenue I look at price and volume, by segment: classic bikes, e-bikes and workshop. On costs I separate variable costs like purchasing from fixed costs like rent and staff.\n\nSince the market is growing but we are losing profit, I suspect a problem at RadWerk itself, more likely in margins than in demand. So I would start with revenue and margin by segment.',note:'A non-overlapping structure (revenue and costs, price and volume), tailored to the case (segments), a clear hypothesis and a proposal where to start.'},
  {who:'int',text:'Good. Here are the numbers.\n\n**Exhibit 1: Revenue and margin by segment**\n\n| Segment | Revenue 2 yrs ago | Revenue today | Margin 2 yrs ago | Margin today |\n|---|---:|---:|---:|---:|\n| Classic bikes | €100m | €60m | 6% | 6% |\n| E-bikes | €40m | €80m | 5% | 0.5% |\n| Workshop | €20m | €20m | 10% | 10% |\n\nWhat stands out to you?'},
  {who:'cand',text:'Three things. First, revenue has stayed flat at €160m although the market is growing. Second, the mix has shifted: e-bikes doubled to €80m, classic bikes fell by 40%. Third, and most important, the e-bike margin collapsed from 5% to 0.5%. At the old margin, e-bikes would make €4m profit today instead of €0.4m, so €3.6m more.\n\nSo the margin decline in e-bikes is the biggest lever. Next I would like to understand why. Is it purchase prices, discounts or both?',note:'Instead of describing every number, the three key observations, one decisive calculation, an interim conclusion and a proposed next step.'},
  {who:'int',text:'The purchase price per e-bike rose by 20% in two years, mainly because of more expensive batteries. RadWerk did not adjust its prices and gives high discounts because of competition. A quick calculation: an e-bike at RadWerk costs €2,500 on average. How many e-bikes does RadWerk sell per year today?'},
  {who:'cand',text:'€80m divided by €2,500. Cancelling zeros: 80,000,000 ÷ 2,500 = 80,000 ÷ 2.5 = 32,000 e-bikes per year.\n\nQuick check: with 50 stores that is 640 e-bikes per store, so about 12 per week. That sounds plausible.',note:'Approach said out loud, zeros cancelled cleanly, result with a unit and a quick sanity check.'},
  {who:'int',text:'The CEO is about to walk in. What do you recommend?'},
  {who:'cand',text:'My recommendation: RadWerk should win back its e-bike margin instead of buying volume with discounts. Three reasons:\n\n1. The e-bike margin decline alone costs €3.6m of profit.\n2. Purchase prices rose by 20%, selling prices did not.\n3. At €80m, e-bikes are now the largest segment. Every margin point here is worth €0.8m.\n\nSpecifically: bundle purchasing and renegotiate with battery suppliers, cap discounts and raise prices selectively. Risk: we lose customers to discounting competitors. Next steps: test price sensitivity in a few stores and start negotiations with the three largest suppliers.',note:'Answer first, three reasons with numbers from the case, concrete measures, a risk and next steps. No retelling of the case.'}
];

/* Recorded example interview for demo mode: a classic interview for a finance trainee role
   at a fictional company. turns: {who:'int'|'cand', text, note?}; score mirrors a real
   scorecard (FIT_CRIT ids, 1 to 5) and speech is the analysis of the spoken answers. */
const EXAMPLE_INTERVIEW={
  de:{
    title:'Vorstellungsgespräch · Trainee Finance bei der Nordwerk AG',
    turns:[
      {who:'int',text:'Schön, dass Sie da sind. Erzählen Sie doch kurz etwas über sich und warum Sie sich für unser Finance-Traineeprogramm interessieren.'},
      {who:'cand',text:'Gern. Ich studiere BWL im Master mit Schwerpunkt Controlling und habe im Praktikum bei einem Maschinenbauer die monatliche Kostenstellenrechnung mit aufgebaut. Dabei habe ich gemerkt, dass mich Zahlen am meisten reizen, wenn daraus Entscheidungen werden. Genau das bietet Ihr Programm: vier Stationen von Werkscontrolling bis Treasury.',note:'Kurz, roter Faden, endet bei der Stelle. So soll ein Einstieg klingen.'},
      {who:'int',text:'Was genau war Ihr Beitrag zur Kostenstellenrechnung?'},
      {who:'cand',text:'Ich habe die Daten aus SAP in ein Excel-Modell übernommen und die Abweichungen kommentiert. Das hat gut funktioniert.',note:'Hier fehlt das Ergebnis. Besser: eine Zahl, zum Beispiel wie viel Zeit oder welche Abweichung gefunden wurde.'},
      {who:'int',text:'Woran haben Sie gemerkt, dass es gut funktioniert hat?'},
      {who:'cand',text:'Der Monatsabschluss im Werk war danach zwei Tage früher fertig, und wir haben eine doppelte Verbuchung von rund 40.000 Euro entdeckt.',note:'Nach der Nachfrage kommt der Beleg. Im echten Gespräch sollte er gleich in der ersten Antwort stehen.'},
      {who:'int',text:'Erzählen Sie von einer Situation, in der Sie unter Zeitdruck einen Fehler gemacht haben.'},
      {who:'cand',text:'In meiner Abschlussarbeit habe ich eine falsche Wechselkursreihe verwendet und es eine Woche vor Abgabe gemerkt. Ich habe sofort meinen Betreuer informiert, die Auswertung neu gerechnet und seitdem prüfe ich Datenquellen mit einer kurzen Checkliste, bevor ich anfange.',note:'Situation, Handlung, Ergebnis und was daraus gelernt wurde. Ehrlich, ohne sich kleinzumachen.'},
      {who:'int',text:'Danke. Haben Sie noch Fragen an uns?'},
      {who:'cand',text:'Ja: Woran merken Sie nach dem ersten Jahr, dass ein Trainee gut angekommen ist?',note:'Eine gute Rückfrage zeigt Interesse am Erfolg in der Rolle, nicht nur an Gehalt und Urlaub.'}
    ],
    score:{gesamt:3.8,verdict:'weiter',
      kriterien:{struktur:4,substanz:3,motivation:4,wirkung:4},
      speech:{answers:5,words:236,sec:104,wpm:136,fill:{'äh':4,'also':2,'halt':1},fillN:7,per100:3},
      gut:['Klarer Einstieg, der direkt zur Stelle führt.','Fehler-Frage souverän: Verantwortung übernommen und konkrete Konsequenz genannt.'],
      besser:['Ergebnisse sofort mit Zahlen belegen, nicht erst auf Nachfrage.','Bei „Was war Ihr Beitrag?“ mit dem eigenen Anteil beginnen, nicht mit dem Werkzeug.']}
  },
  en:{
    title:'Job interview · Finance trainee at Nordwerk AG',
    turns:[
      {who:'int',text:'Good to have you here. Please tell us a little about yourself and why you are interested in our finance trainee programme.'},
      {who:'cand',text:'Sure. I am doing a master’s in business with a focus on controlling, and during my internship at a machinery maker I helped set up the monthly cost centre reporting. That showed me numbers excite me most when they turn into decisions. Your programme offers exactly that: four rotations from plant controlling to treasury.',note:'Short, with a clear thread that ends at the role. This is how an opening should sound.'},
      {who:'int',text:'What exactly was your contribution to the cost centre reporting?'},
      {who:'cand',text:'I moved the data from SAP into an Excel model and commented on the variances. That worked well.',note:'The result is missing. Better: a number, for example how much time was saved or which variance was found.'},
      {who:'int',text:'How did you know it worked well?'},
      {who:'cand',text:'The plant’s month-end close was finished two days earlier afterwards, and we found a duplicate booking of about 40,000 euros.',note:'The evidence comes after the follow-up. In a real interview it belongs in the first answer.'},
      {who:'int',text:'Tell me about a time you made a mistake under time pressure.'},
      {who:'cand',text:'In my thesis I used the wrong exchange rate series and noticed one week before the deadline. I told my supervisor right away, recalculated the analysis, and since then I check data sources with a short checklist before I start.',note:'Situation, action, result and what was learned. Honest without talking yourself down.'},
      {who:'int',text:'Thank you. Do you have any questions for us?'},
      {who:'cand',text:'Yes: after the first year, how can you tell that a trainee has really settled in?',note:'A good question shows interest in succeeding in the role, not just in salary and holidays.'}
    ],
    score:{gesamt:3.8,verdict:'weiter',
      kriterien:{struktur:4,substanz:3,motivation:4,wirkung:4},
      speech:{answers:5,words:228,sec:101,wpm:135,fill:{'um':4,'like':2,'basically':1},fillN:7,per100:3.1},
      gut:['Clear opening that leads straight to the role.','Handled the mistake question well: took responsibility and named a concrete change.'],
      besser:['Back up results with numbers right away, not only when asked.','When asked about your contribution, start with your own part, not the tool.']}
  }
};
