/* Musterkampagne „Die leisen Wasser“ – deutsche Texte. Alles erfunden. Aufbau siehe types.ts. */
import type { MusterTextA } from './types';

const MARA_BACKSTORY = `Mara wuchs in Hohenwacht auf, wo ihre Mutter Liv Venn Karten für das Archiv zeichnete. Vor sechs Jahren ging Liv eines Abends ins Archiv und kam nicht zurück; die Stadt erklärte, sie sei fortgezogen. Mara glaubte das nicht und floh zu ihrem Onkel Brann nach Grauwehr, weil sie in Hohenwacht niemandem mehr traute. Zwei Jahre lief sie mit den Schilfgängern und lernte, das Moor zu lesen wie andere ein Buch. Vom Archiv spricht sie nicht gern, den Kompass ihrer Mutter legt sie nie ab.`;
const TAVIN_BACKSTORY = `Tavin kam als Waisenkind in die Schreibstube des Archivs von Hohenwacht und lernte bei Meister Aldo Fenn, sauber zu schreiben, schnell zu lesen und nicht zu viel zu fragen. Im letzten Winter schrieb er zur Übung eine Seite aus einem alten Grenzregister ab. Als Aldo im Frühjahr verschwand, verließ Tavin die Stadt und nahm die Abschrift mit, obwohl er sie nicht hätte haben dürfen. Den Sommer über zog er als Schreiber durch die Dörfer am Moorrand, mit Briefen, Verträgen und Grabinschriften. Jetzt will er zurück und herausfinden, wohin sein Lehrmeister verschwunden ist.`;
const JUNA_BACKSTORY = `Juna trägt seit vier Jahren Briefe für die Moorpost, zwischen den Dörfern am Rand des Senkmoors und Hohenwacht. Sie kennt jede Poststelle, jeden Hofhund und jede Brücke, die bei Hochwasser nicht trägt. Was in ihrer Tasche steckt, liest sie nie, darauf ist sie stolz. Nur einen Brief konnte sie nie zustellen; er liegt seit drei Jahren ganz unten in ihrer Tasche, weil niemand die Empfängerin finden konnte.`;

export const deA: MusterTextA = {
  title: `Die leisen Wasser`,
  description: `Drei Reisende auf dem Weg durchs Senkmoor nach Hohenwacht, wo im Archiv mehr verschwindet als Papier.`,
  systemName: `Nebelpfad (Hausregeln)`,
  worldInfo: `Das Senkmoor liegt zwischen den Fischerdörfern am Westrand und der Stadt Hohenwacht, die im Osten auf einem Felsrücken über dem Nebel steht. Durch das Moor zieht die Ennel, langsam und braun, im Herbst oft über die Ufer. Feste Wege gibt es wenige: die alte Straße über die Zollbrücke, ein paar Bohlenwege und die Pfade, die die Schilfgänger mit geknoteten Halmen markieren. Wer das Moor durchqueren will, braucht Führer oder Fähre.

Grauwehr ist das letzte Dorf am Westufer der Ennel, wo der Fluss ins tiefe Moor eintritt. Man lebt dort vom Aal, vom Torf und von dem, was der Fluss anschwemmt. Eine halbe Tagesreise nördlich steht an der Moorstraße der Moorkrug, das einzige Gasthaus weit und breit. Hohenwacht hat einen Rat, eine Ratskanzlei und das große Archiv, in dem seit Jahrhunderten verzeichnet wird, wem welches Land und welches Wasser gehört.

Am Moorrand glaubt man an die Stillen: die Ertrunkenen, die unter dem Wasser weiterleben und vor allem Ruhe wollen. Man spricht nachts leise über dem Wasser und wirft eine Münze in jeden Fluss, den man überquert. In Hohenwacht hält man das für Aberglauben. Münzen werfen die Leute dort trotzdem.

Briefe trägt die Moorpost, Botinnen und Boten, die die Pfade zwischen den Dörfern und der Stadt zu Fuß gehen. Salz ist am Moorrand teuer, es kommt mit Fuhrwerken über die Zollbrücke. Wer ein Boot hat, hat Freunde; wer eine Laterne aufs Wasser hängt, hat meistens einen guten Grund.`,
  hotwords: ['Grauwehr', 'Hohenwacht', 'Senkmoor', 'Ennel', 'Oren Silt', 'Iria Sehl', 'Mara Venn', 'Tavin Rook', 'Juna Pell', 'Brann',
    'Aldo Fenn', 'Liv Venn', 'Schilfgänger', 'Moorpost', 'Moorkrug', 'Zollbrücke', 'Berit Kamm', 'Sefa Morr', 'Ohm Tessel',
    'Edmar Quell', 'Jorin Malz', 'Hungerstein', 'Grenzregister'],

  members: {
    lea: {
      summary: `Kundschafterin aus Grauwehr, spricht wenig, sieht viel.`,
      backstory: MARA_BACKSTORY
    },
    tom: {
      summary: `Wandernder Schreiber mit Tinte an den Ärmeln und einer Antwort für alles, außer für die wichtigen Fragen.`,
      backstory: TAVIN_BACKSTORY
    },
    sina: {
      summary: `Botin der Moorpost, schneller als jedes Gerücht und genauso schwer aufzuhalten.`,
      backstory: JUNA_BACKSTORY
    }
  },

  chapters: [
    {
      title: `Der Weg nach Grauwehr`, date: '2026-06-13', minutes: 190, present: ['anja', 'lea', 'tom'],
      recap: `Wir trafen uns am Kreuzstein an der alten Straße, wo das Wasser des Senkmoors schon über den Weg stand. Tavin Rook, ein wandernder Schreiber, wollte nach Hohenwacht und suchte jemanden, der ihn bis Grauwehr bringt. Mara Venn nahm zwei Kupfermünzen und führte ihn über die Bohlenwege.

Unterwegs erzählte Tavin, dass er im Archiv von Hohenwacht gelernt hat und eine Abschrift von dort bei sich trägt. Mara sagte dazu nichts. Am Nachmittag zog Nebel auf. Mara fand den Weg an geknoteten Schilfhalmen, die die Schilfgänger hinterlassen hatten.

Am Abend erreichten wir Grauwehr. Maras Onkel Brann, ein Fischer, gab uns Suppe und einen Platz am Ofen. Er erzählte, dass in diesem Frühjahr mehrere Familien das Dorf verlassen haben und dass das Brunnenwasser seit einigen Wochen seltsam schmeckt.`,
      threads: [`Warum haben so viele Familien Grauwehr verlassen?`, `Was stimmt nicht mit dem Brunnen?`],
      gmNote: `Tavins Abschrift ist eine Seite aus dem alten, unveränderten Grenzregister der Flur Grauwehr-Nord. Er weiß nicht, was er da trägt. Die Familien gehen, weil jemand das Leben in Grauwehr gezielt schwer macht.`
    },
    {
      title: `Salz im Brunnen`, date: '2026-06-27', minutes: 205, present: ['anja', 'lea', 'tom'],
      recap: `Am Morgen schmeckte das Wasser aus dem Dorfbrunnen so salzig, dass Brann es nicht einmal mehr den Ziegen gab. Auf dem Dorfplatz stritten die Leute darüber, ob der Fluss das Moor versalzt oder ob der Brunnen verflucht ist.

Tavin las im Dorfbuch nach und fand keinen Eintrag, nach dem der Brunnen je versalzen gewesen wäre, nicht in hundert Jahren. Mara ließ sich am Seil in den Schacht hinab. Etwa auf halber Höhe steckten drei Säcke zwischen den Steinen, schwer und nass, voller Salz.

Wir holten die Säcke mit Branns Bootshaken herauf. Brann sagte, so viel Salz habe in Grauwehr niemand, das komme von außerhalb. Wir schöpften den Brunnen zweimal aus. Am Abend schmeckte das Wasser schon weniger salzig, und Brann meinte, in ein paar Tagen sei es wieder gut.`,
      threads: [`Wer hat die Säcke in den Brunnen gelegt?`, `Woher kommt so viel Salz?`],
      gmNote: `Die Säcke stammen aus dem Lager an der Zollbrücke. Ein vierter Sack riss unten im Schacht auf und versank; auf ihm war das Turmzeichen des Archivs eingebrannt, nur Mara hat es gesehen. Quell ließ das Salz über die Archivkasse kaufen. Ziel: Grauwehr soll sich leeren, damit die Flur im Register als verlassen gilt.`
    },
    {
      title: `Die Zollbrücke`, date: '2026-07-11', minutes: 200, present: ['anja', 'lea', 'tom'],
      recap: `Wir wollten auf der alten Straße weiter nach Hohenwacht und kamen zur Zollbrücke über die Ennel. Die Schranke war unten. Ein Aushang verkündete, dass die Brücke auf Anordnung des Rates von Hohenwacht gesperrt ist.

Die Zöllnerin Berit Kamm verlangte einen Passierschein, den wir nicht hatten. Tavin bot an, ihr Zollbuch neu zu schreiben, das in schlechtem Zustand war. Sie lehnte ab, ließ uns aber im Zollhaus am Ofen warten, bis der Regen nachließ.

Hinter dem Zollhaus stand ein offener Schuppen. Mara sah darin Säcke derselben Art wie im Brunnen von Grauwehr. Als wir Berit danach fragten, sagte sie, das sei Streusalz für den Winter.

Zum Abschied meinte Berit, über die Ennel komme jetzt nur noch, wer mit Oren Silt fahre, dem Fährmann bei Grauwehr. Der fahre aber nicht für jeden.`,
      threads: [`Warum hat der Rat die Brücke gesperrt?`, `Stammen die Säcke im Brunnen aus Berits Schuppen?`, `Wie überredet man Oren Silt?`],
      gmNote: `Berit hat das Salz gegen Bezahlung herausgegeben, weiß aber nicht genau, wer dahintersteckt. Die Sperre gilt nur für Leute ohne Passierschein; die Grenzreiter kommen jederzeit durch.`
    },
    {
      title: `Ein Brief ohne Siegel`, date: '2026-07-25', minutes: 185, present: ['anja', 'lea', 'tom', 'sina'],
      recap: `Zurück in Grauwehr wartete am Anleger eine Botin der Moorpost: Juna Pell, mit nassen Stiefeln und einer Tasche voller Briefe. Einer war an „Tavin Rook, Schreiber, zurzeit in Grauwehr“ gerichtet. Er trug kein Siegel und keine Unterschrift.

Im Brief stand, Tavin solle die Abschrift nicht nach Hohenwacht zurückbringen, solange die Schlüssel des Archivs in falschen Händen sind, und niemandem trauen, der ihm nach Hohenwacht hilft. Tavin sagte, er kenne die Schrift: Sie gehöre seinem Lehrmeister Aldo Fenn, der seit dem Frühjahr verschwunden ist.

Juna erzählte, ein Mann im grauen Mantel habe ihr den Brief an der Poststelle in Hohenwacht gegeben und das doppelte Botengeld bezahlt, ohne eine Quittung zu wollen. Den Mann kannte sie nicht. Weil die Brücke gesperrt ist, war sie über die alte Furt im Norden gekommen, drei Tage Umweg; nach dem Regen der letzten Tage sei die Furt nicht mehr zu begehen.

Juna beschloss, ein Stück mit uns zu gehen, weil ihre nächste Botentour ohnehin durchs Moor führt. Brann erzählte, Oren Silt trinke abends oft im Moorkrug.`,
      threads: [`Wer war der Mann im grauen Mantel?`, `Was meint der Brief mit „solange die Schlüssel in falschen Händen sind“?`, `Wo ist Aldo Fenn?`],
      gmNote: `Der Mann im grauen Mantel war Aldo Fenn selbst. Offiziell ist er verreist; tatsächlich lässt Quell ihn in seinem Haus beobachten, und er schlich sich nur für den Brief zur Poststelle. „Die Schlüssel“ sind die zum Archiv, die seit sieben Jahren bei Ratsschreiber Edmar Quell liegen.`
    },
    {
      title: `Nacht im Moorkrug`, date: '2026-08-22', minutes: 180, present: ['anja', 'tom', 'sina'],
      recap: `Mara blieb an diesem Abend bei Brann in Grauwehr. Tavin und Juna gingen zum Moorkrug, um dort nach Oren Silt zu fragen. Der Wirt Jorin Malz sagte, Oren sei seit Tagen nicht da gewesen.

In der Gaststube saß eine Grenzreiterin aus Hohenwacht, Sefa Morr, in grauem Mantel. Sie fragte die Gäste nach einer Frau mit Tinte an den Fingern, die aus der Stadt fortgegangen sei. Niemand wollte sie gesehen haben.

In der Nacht wachte Juna auf, weil die Dielen knarrten. Sefa Morr stand an unserem Tisch und hatte Tavins Tasche geöffnet. Als Juna sie ansprach, sagte sie, sie habe sich in der Tasche geirrt, und ging hinaus. Es fehlte nichts. Die Abschrift steckte ohnehin in Tavins Stiefel.

Am Morgen war Sefa Morr fort. Jorin Malz meinte, in diesem Sommer seien mehr Grenzreiter auf der Moorstraße unterwegs als in den Jahren davor.`,
      threads: [`Wen sucht Sefa Morr?`, `Was wollte sie in Tavins Tasche?`],
      gmNote: `Sefa sucht Iria Sehl im Auftrag von Edmar Quell. Sie vermutet, dass ein früherer Archivschreiber wie Tavin Iria helfen könnte, und wollte wissen, was er bei sich trägt.`
    },
    {
      title: `Stimmen im Schilf`, date: '2026-09-05', minutes: 210, present: ['anja', 'lea', 'tom', 'sina'], guest: 'Mika',
      recap: `Mara führte uns ins Schilf nördlich von Grauwehr, dorthin, wo die Schilfgänger ihre Lager haben; sie leben an beiden Ufern der Ennel. Lange hörten wir nur Pfiffe aus Schilfrohr, mal links, mal rechts. Mara antwortete mit zwei kurzen Pfiffen, und es wurde still.

Ein junger Schilfgänger namens Rell brachte uns zu Ohm Tessel, dem Ältesten. Tessel erzählte, dass an der Zollbrücke seit dem Sommer Grenzreiter Wache halten und alle ohne Passierschein zurückschicken. Er riet uns, mit Oren Silt zu fahren.

Über Oren sagte Tessel nur, er fahre in dunklen Nächten, nehme eine Kupfermünze pro Person und lasse die Laterne aus. Wer Licht wolle, könne ja schwimmen.

Rell begleitete uns am nächsten Abend zurück zum Anleger bei Grauwehr und zeigte uns, wo Orens Fähre liegt. Die nächste dunkle Nacht ist in zwei Wochen.`,
      threads: [`Warum bewachen Grenzreiter eine gesperrte Brücke?`, `Kennt Ohm Tessel Oren besser, als er zugibt?`],
      gmNote: `Die Schilfgänger wissen, dass Oren in diesem Herbst jemanden aus Hohenwacht hinüberbringt, aber nicht, wen. Tessel will die Gruppe dabei haben, damit jemand hinsieht.`
    },
    {
      title: `Die letzte Fähre von Grauwehr`, date: '2026-09-19', minutes: 195, present: ['anja', 'lea', 'tom', 'sina'],
      recap: `In der dunklen Nacht gingen wir zum Anleger. Oren Silt wartete schon. Er sagte, das sei für dieses Jahr seine letzte Fahrt, bald stehe die Ennel zu hoch.

Bei Grauwehr setzte uns Oren Silt über den Fluss. Eine Kupfermünze pro Person, die Laterne aus. Er stand vorn an der Stange und sprach während der ganzen Überfahrt kein Wort. Die Fähre lag tiefer im Wasser, als wir erwartet hatten.

Am anderen Ufer lag der Weg nach Hohenwacht im Nebel. Oren band die Fähre am Anleger fest und sagte, er schlafe an Bord und fahre am Morgen zurück. Wir schlugen unser Lager unter einer alten Weide auf.`,
      threads: [`Warum wollte der Fährmann so wenig Licht?`, `Warum lag die Fähre so tief im Wasser?`],
      gmNote: `Unter den vorderen Planken lag Iria Sehl. Oren trug ihren Siegelring als Pfand; Mara hat ihn gesehen. Tavin hat Irias Klopfzeichen gehört. Beides weiß jeweils nur eine Figur.`
    }
  ],
  entries: [
    { key: 'mara', type: 'pc', holder: 'lea', name: `Mara Venn`, summary: `Kundschafterin aus Grauwehr, spricht wenig, sieht viel.`,
      mentions: [[1, `führte Tavin für zwei Kupfermünzen nach Grauwehr`], [2, `ließ sich am Seil in den Brunnenschacht hinab`], [3, `sah im Schuppen der Zöllnerin Salzsäcke`], [6, `führte uns zu den Schilfgängern`], [7, `fuhr mit Oren über die Ennel`]] },
    { key: 'tavin', type: 'pc', holder: 'tom', name: `Tavin Rook`, summary: `Wandernder Schreiber mit Tinte an den Ärmeln und einer Antwort für alles, außer für die wichtigen Fragen.`,
      mentions: [[1, `suchte einen Führer nach Grauwehr`], [2, `fand im Dorfbuch keinen versalzenen Brunnen`], [3, `bot an, Berits Zollbuch neu zu schreiben`], [4, `erkannte im Brief die Schrift von Aldo Fenn`], [5, `seine Tasche wurde nachts durchsucht`], [7, `fuhr mit Oren über die Ennel`]] },
    { key: 'juna', type: 'pc', holder: 'sina', name: `Juna Pell`, summary: `Botin der Moorpost, schneller als jedes Gerücht und genauso schwer aufzuhalten.`,
      mentions: [[4, `brachte Tavin den Brief ohne Siegel`], [5, `überraschte Sefa Morr an Tavins Tasche`], [6, `ging mit zu den Schilfgängern`], [7, `fuhr mit Oren über die Ennel`]] },
    { key: 'oren', type: 'npc', name: `Oren Silt`, summary: `Fährmann bei Grauwehr. Nimmt eine Kupfermünze pro Person und fährt nur ohne Licht. Seit die Brücke gesperrt ist, der einzige Weg über die Ennel. Brachte uns in Kapitel 7 hinüber.`,
      gmNotes: `Hilft Iria Sehl gegen Bezahlung bei der Flucht; ihr Siegelring dient als Pfand, bis der Rest bezahlt ist. Er weiß nicht, was sie bei sich trägt.`,
      mentions: [[3, `Berit nannte ihn als einzigen Weg über die Ennel`], [4, `trinkt laut Brann abends im Moorkrug`], [5, `war seit Tagen nicht im Moorkrug`], [6, `Ohm Tessel riet, mit ihm zu fahren`], [7, `setzte uns ohne Licht über`]] },
    { key: 'berit', type: 'npc', name: `Berit Kamm`, summary: `Zöllnerin an der Zollbrücke. Ließ uns ohne Passierschein nicht hinüber. In ihrem Schuppen lagern Salzsäcke, laut ihr Streusalz für den Winter.`,
      gmNotes: `Hat gegen Bezahlung Salz aus dem Brückenlager herausgegeben, das in den Brunnen von Grauwehr kam. Weiß nicht genau, wer dahintersteckt.`,
      mentions: [[3, `verlangte einen Passierschein und sprach von Streusalz`]] },
    { key: 'sefa', type: 'npc', name: `Sefa Morr`, summary: `Grenzreiterin aus Hohenwacht im grauen Mantel. Fragte im Moorkrug nach einer Frau mit Tinte an den Fingern und durchsuchte nachts Tavins Tasche.`,
      gmNotes: `Sucht Iria Sehl im Auftrag von Edmar Quell.`,
      mentions: [[5, `fragte nach einer Frau mit Tinte an den Fingern, öffnete Tavins Tasche`]] },
    { key: 'tessel', type: 'npc', name: `Ohm Tessel`, summary: `Ältester der Schilfgänger. Spricht leise und lässt andere ausreden. Riet uns, mit Oren Silt zu fahren statt über die Brücke.`,
      gmNotes: `Weiß, dass Oren in diesem Herbst jemanden aus Hohenwacht hinüberbringt, aber nicht, wen.`,
      mentions: [[6, `erzählte von den Grenzreitern an der Brücke`]] },
    { key: 'iria', type: 'npc', gmOnly: true, name: `Iria Sehl`, summary: `Archivarin aus Hohenwacht.`,
      gmNotes: `Auf der Flucht aus Hohenwacht. Versteckt sich unter den vorderen Planken von Orens Fähre und trägt Abschriften veränderter Grenzregister bei sich. Ihr Siegelring ist Orens Pfand.`,
      mentions: [[7, `lag während der Überfahrt unter den vorderen Planken`]] },
    { key: 'quell', type: 'npc', gmOnly: true, name: `Edmar Quell`, summary: `Ratsschreiber in Hohenwacht, verwahrt die Schlüssel zum Archiv.`,
      gmNotes: `Lässt seit sechs Jahren Seiten der Grenzregister ersetzen, seit zwei Jahren vor allem für die Fluren um Grauwehr. Auftraggeber von Sefa Morr; das Salz im Brunnen geht auf ihn zurück.` },
    { key: 'grauwehr', type: 'location', name: `Grauwehr`, summary: `Fischerdorf am Westufer der Ennel, am Rand des Senkmoors. Hier wohnt Maras Onkel Brann. Im Frühsommer war der Brunnen versalzen.`,
      mentions: [[1, `Ankunft bei Brann`], [2, `der Dorfbrunnen war versalzen`], [4, `Juna wartete am Anleger`], [6, `Rell zeigte uns Orens Anleger`], [7, `Abfahrt der Fähre`]] },
    { key: 'hohenwacht', type: 'location', name: `Hohenwacht`, summary: `Stadt auf dem Felsrücken östlich des Moors, mit Rat, Ratskanzlei und dem großen Archiv. Ziel unserer Reise.`,
      mentions: [[1, `Tavins Ziel`], [3, `der Rat ließ die Brücke sperren`], [4, `der Brief wurde dort aufgegeben`], [5, `Sefa Morr kommt von dort`], [7, `der Weg dorthin lag jenseits der Ennel im Nebel`]] },
    { key: 'senkmoor', type: 'location', name: `Senkmoor`, summary: `Weites Moor zwischen Grauwehr und Hohenwacht, durchzogen von der Ennel. Ohne Führer oder Fähre kommt man nicht hindurch.`,
      mentions: [[1, `Wasser stand über der alten Straße`], [6, `Lager der Schilfgänger im Schilf`], [7, `der Weg nach Hohenwacht lag im Nebel`]] },
    { key: 'moorkrug', type: 'location', name: `Moorkrug`, summary: `Gasthaus an der Moorstraße, eine halbe Tagesreise nördlich von Grauwehr. Wirt ist Jorin Malz.`,
      mentions: [[4, `Brann: Oren trinkt dort`], [5, `Nacht mit Sefa Morr`]] },
    { key: 'bruecke', type: 'location', name: `Zollbrücke`, summary: `Steinbrücke über die Ennel an der alten Straße nach Hohenwacht. Seit dem Sommer auf Anordnung des Rates gesperrt; Durchlass nur mit Passierschein.`,
      gmNotes: `Die Sperre gilt nicht für Grenzreiter.`,
      mentions: [[3, `gesperrt, Salz im Schuppen`], [6, `Grenzreiter halten dort Wache`]] },
    { key: 'schilfgaenger', type: 'faction', name: `Die Schilfgänger`, summary: `Kundschafter des Senkmoors, die sichere Wege mit geknoteten Halmen markieren. Mara war zwei Jahre bei ihnen.`,
      mentions: [[1, `ihre geknoteten Halme zeigten den Weg`], [6, `Besuch bei Ohm Tessel`]] },
    { key: 'moorpost', type: 'faction', name: `Die Moorpost`, summary: `Botinnen und Boten, die Briefe auf den Moorpfaden zwischen den Dörfern und Hohenwacht tragen. Juna gehört seit vier Jahren dazu.`,
      mentions: [[4, `Juna kam als Botin der Moorpost`]] },
    { key: 'q-salz', type: 'quest', status: 'done', name: `Das Salz im Brunnen`, summary: `Der Brunnen von Grauwehr schmeckte nach Salz. Wir fanden drei Salzsäcke im Schacht und holten sie heraus; das Wasser wird wieder klar. Wer sie hineingelegt hat, ist offen.`,
      gmNotes: `Der Auftrag kam aus Hohenwacht; Grauwehr soll sich leeren.`,
      mentions: [[2, `Säcke gefunden und herausgeholt`], [3, `gleiche Säcke im Schuppen an der Brücke`]] },
    { key: 'q-ennel', type: 'quest', status: 'done', name: `Über die Ennel`, summary: `Die Brücke war gesperrt, wir brauchten einen anderen Weg über den Fluss. Oren Silt setzte uns in einer dunklen Nacht über.`,
      mentions: [[3, `Brücke gesperrt`], [6, `Tessel riet zur Fähre`], [7, `mit Oren übergesetzt`]] },
    { key: 'q-hohenwacht', type: 'quest', status: 'active', name: `Nach Hohenwacht`, summary: `Tavin will nach Hohenwacht, um seinen Lehrmeister zu finden. Seit dem Brief ohne Siegel ist offen, ob das eine gute Idee ist.`,
      mentions: [[1, `Tavin will nach Hohenwacht`], [4, `der Brief warnt davor`], [7, `der Weg liegt jenseits der Ennel`]] },
    { key: 'abschrift', type: 'item', holder: 'tom', name: `Tavins Abschrift`, summary: `Eine Abschrift aus dem Archiv von Hohenwacht, die Tavin mitnahm, als er die Stadt verließ. Sie zeigt Flurgrenzen rund um Grauwehr. Tavin trägt sie im Stiefel.`,
      gmNotes: `Eine Seite aus dem alten, unveränderten Grenzregister. Zusammen mit Irias Abschriften ein Beweis für die Fälschung.`,
      mentions: [[1, `Tavin erzählte davon`], [4, `der Brief nennt sie`], [5, `lag sicher in Tavins Stiefel`]] },
    { key: 'brief', type: 'item', holder: 'tom', name: `Brief ohne Siegel`, summary: `Brief ohne Siegel und ohne Unterschrift, den Juna Pell Tavin brachte. Er warnt Tavin, die Abschrift nach Hohenwacht zu bringen. Tavin erkennt darin die Schrift von Aldo Fenn.`,
      gmNotes: `Aldo Fenn hat ihn selbst im grauen Mantel an der Poststelle abgegeben.`,
      mentions: [[4, `von Juna überbracht`]] },
    { key: 'turmzeichen', type: 'other', hiddenFrom: ['tom', 'sina'], name: `Turmzeichen im Brunnenschacht`, summary: `Unten im Schacht hing ein vierter Salzsack, der aufriss und versank, bevor wir ihn heraufholen konnten. Auf ihm war ein Zeichen eingebrannt: ein schmaler Turm mit drei Fenstern. Mara sah es, als sie am Seil hing. Sie kennt es von den Karten ihrer Mutter, es ist das Zeichen des Archivs von Hohenwacht.`,
      gmNotes: `Die Säcke kamen aus dem Lager an der Zollbrücke; Quell ließ das Salz über die Archivkasse kaufen. Das Zeichen beweist den Weg nach Hohenwacht.`,
      mentions: [[2, `Mara sah es im Schacht auf einem vierten Sack, der versank`]] },
    { key: 'siegelring', type: 'other', hiddenFrom: ['tom', 'sina'], name: `Siegelring an Orens Hand`, summary: `Bei der Überfahrt trug Oren Silt einen Siegelring des Archivs von Hohenwacht, mit dem Turm mit drei Fenstern. Mara sah ihn im Schein von Orens Pfeife, als er die Münzen nahm.`,
      gmNotes: `Es ist Iria Sehls Ring, ihr Pfand für die Überfahrt.`,
      mentions: [[7, `Mara sah ihn im Schein von Orens Pfeife`]] },
    { key: 'klopfen', type: 'other', hiddenFrom: ['lea', 'sina'], name: `Klopfen unter den Planken`, summary: `Während der Überfahrt hörte Tavin, der ganz vorn saß, dreimal ein Klopfen unter den vorderen Planken der Fähre. Oren tat, als höre er nichts.`,
      gmNotes: `Iria Sehls verabredetes Zeichen an Oren, dass unter den Planken alles in Ordnung ist.`,
      mentions: [[7, `Tavin hörte es dreimal`]] },
    { key: 'register', type: 'other', gmOnly: true, name: `Die Grenzregister`, summary: `Die Grenzregister im Archiv von Hohenwacht verzeichnen, wem welches Land und welches Wasser im Senkmoor gehört.`,
      gmNotes: `Seit gut sechs Jahren werden Seiten ersetzt, seit zwei Jahren vor allem die der Fluren um Grauwehr: Sie gelten darin als verlassen oder überschwemmt und fallen damit an den Rat. Liv Venn bemerkte die ersten Fälschungen und verschwand. Tavins Abschrift zeigt den alten Stand.` }
  ],
};
