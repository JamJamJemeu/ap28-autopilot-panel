# Historia zmian / Changelog

(po polsku / in Polish)

## 1.15.0

- ruszenie przepustnica wylacza caly AP (napis "АП ОТКЛ: РУД"): przesuniecie dzwigni o ponad
  5% od chwili wlaczenia AP (os, kilka wcisniec F2/F3, mysz). Z wlaczonym АТ ruch pilota
  wykrywa АТ i wylacza wtedy АТ i AP. Opcja: AP_CONFIG.throttleDisconnectsAP / throttleApDiff.

## 1.14.1

- naprawa VOR / ILS: w MSFS 2024 wyniki szukania najblizszych stacji przychodza osobnym
  zdarzeniem (NearestSearchCompleted), a panel czekal na nie w odpowiedzi - dlatego zawsze
  "w pamieci 0" i НЕТ СИГНАЛА. Teraz panel odbiera to zdarzenie.

## 1.14.0

- caly log panelu zapisuje sie do pliku ap28panel.log w folderze wtyczki Stream Panel
  (...\plugins\pl.jamjam.ap28.sdPlugin\). Dziala, gdy program Mad Doga jest uruchomiony,
  takze przy wylaczonym СВЯЗЬ. Okno logu w grze nie musi byc wlaczone. Poprzedni lot zostaje
  jako ap28panel.old.log. Wylaczenie: AP_CONFIG.fileLog = false. Wymaga wtyczki 1.5.0.

## 1.13.2

- VOR: zwykle wyszukiwanie stacji znow bez filtra (filtr dla ILS mogl w grze odcinac wszystkie
  stacje); ILS szukany w osobnej sesji.
- log VOR co 5 s (gdy ИСТ НВУ = VOR): czestotliwosc, sygnal, ile stacji w pamieci, najblizsze
  stacje z czestotliwosciami. Kazde wyszukiwanie: "VOR: wyszukiwanie nr N: nowych ...".

## 1.13.1

- ILS (КРМ) na VOR: gdy czestotliwosc jest z pasma ILS (108.10-111.95, nieparzyste dziesiate)
  i wyszukiwanie stacji go nie znalazlo, panel sprawdza lotniska w promieniu 40 NM i bierze ILS
  z danych pasow (czestotliwosc pasa, antena za koncem pasa, kurs pasa). Log: "ILS: EPRZ - 1 KRM".

## 1.13.0

- ruszenie przepustnica wylacza АТ (napis "АТ ОТКЛ: РУД"): skok osi, kilka wcisniec F2/F3
  albo przesuniecie dzwigni mysza. Wczesniej AT nadpisywal ruch pilota i sie nie wylaczal.
  Pojedyncze, male stukniecie klawiszem jest ignorowane.
- opcja: Shift + klik na АТ wlacza / wylacza te funkcje ("РУД ОТКЛ АТ: ВКЛ / ВЫКЛ"),
  zapamietywane. W AP28Panel.js: AP_CONFIG.at.pilotOverride, overrideDiff, overrideSum.

## 1.12.2

- diagnostyka Stream Panel: kazde polecenie z Mad Doga trafia do logu panelu ze skutkiem
  (np. "polecenie ap -> AP ON LVL/LVL" albo "NA ZIEMI - AP sie nie wlacza"), a panel
  odsyla wtyczce licznik wykonanych polecen.

## 1.12.1

- Stream Panel: klawisze Mad Doga nie dzialaly, choc odczyty szly (gra wysylala dane, ale nie
  dawala panelowi przeczytac odpowiedzi z poleceniami). Panel uznaje polaczenie dopiero, gdy
  odczyta odpowiedz, a jesli XHR nie pozwala - przechodzi na kanal <script> (JSONP).
  Wymaga wtyczki Stream Panel 1.4.3.

## 1.12.0

- zmiana wartosci zeruje nizsze cyfry: np. wysokosc 3977, zmiana dziesiatek -> 3980 / 3970,
  setek -> 4000 / 3900. Dotyczy wysokosci, kursu, ZK, VS, predkosci AT, OBS/ZPU,
  czestotliwosci, cisnienia VEM-72 i progu ОПАСН. ВЫС. (takze z Mad Doga).
- usunieta aplikacja AP-28 z tabletu EFB - panel jest tylko w toolbarze.

## 1.11.1

- panel wysyla do wtyczki Stream Panel informacje o sygnale zrodla NVU (ikona ИСТ НВУ, wtyczka 1.4.1).

## 1.11.0

- VOR odbiera tez ILS: kursowa radiolatarnia (КРМ), np. Rzeszow 110.30 (IRZ, pas 27).
  Kurs КРМ jest staly (z bazy symulatora) - OBS go nie zmienia; na wyswietlaczu "КРМ IRZ 264".
  Wczesniej wyszukiwanie stacji pomijalo ILS, stad НЕТ СИГНАЛА.
- przelot nad КРМ (koniec pasa) nie przelacza NA -> OT.
- wspolpraca z wtyczka Stream Panel 1.4.0: nowe odczyty (przyrzady, punkt trasy, wiatr, czas,
  paliwo...), klawisze radia (NA/OT, czestotliwosc, OBS) i wylaczanie polaczenia klawiszem СВЯЗЬ.

## 1.10.0

- aplikacja "AP-28" na tablecie EFB (MSFS 2024): ten sam panel (oba wyglady, VEM-72, NVU,
  AT, DEMPF, Stream Panel) otwierany na tablecie w kabinie. Panel w toolbarze dziala dalej.
  Pliki: html_ui\efb_ui\efb_apps\AP28Autopilot\.
- blokada: panel z toolbara i aplikacja EFB nie steruja naraz. Steruje ten, w ktorym pierwszy
  wlaczono AP / AT / DEMPF; w drugim wlaczenie konczy sie napisem "АП: ДРУГОЕ ОКНО".
  Zmienne L:AP28_OWN, L:AP28_OWN_T, L:AP28_TB_T.
- Stream Panel obsluguje egzemplarz, ktory steruje; gdy nikt nie steruje - panel z toolbara.
- w EFB panel skaluje sie do szerokosci i wysokosci ekranu tabletu.

## 1.9.0

- przelacznik ИСТ НВУ (3 polozenia) w wierszu ARK - VOR: MARSH (trasa z EFB) / ARK / VOR -
  skad NVU bierze kierunek; klik w gorna / srodkowa / dolna czesc albo kolko. Przycisk VOR usuniety.
- trasa z EFB zawiera punkty SID i STAR wybrane w planie lotu (AP_CONFIG.nav.useProcedures);
  punkty bez wspolrzednych (np. wznoszenie do wysokosci, wektory) sa pomijane.

## 1.8.0

- wlasny odbiornik VOR: panel sam szuka stacji VOR o ustawionej czestotliwosci w bazie
  nawigacyjnej symulatora i liczy radial i odleglosc - dziala w samolotach bez radia NAV
  (np. An-28). Czestotliwosc i OBS ustawia sie w wierszu ARK - VOR, ident stacji jest
  na wyswietlaczu. AP_CONFIG.radio.vorMode = "sim" przywraca radio NAV1 samolotu.
- AT (turkusowy przycisk; w AP-28L1 przycisk AT w stopce): automat ciagu - po wlaczeniu
  utrzymuje obecna predkosc przyrzadowa przepustnica; kolko nad przyciskiem zmienia predkosc
  (1 kt / 5 km/h, Shift x10). Ruszenie dzwignia przez pilota albo przyziemienie wylacza AT.
  Ustawienia: AP_CONFIG.at (m.in. liczba silnikow, zakres przepustnicy).

Nowosci w 1.7.0 - 1.7.2 (odczyty dla wyswietlacza Stream Panelu, kilka sposobow laczenia + diagnostyka w logu)
---------------
- polaczenie z zewnetrznym panelem (Stream Panel GK150 / Stream Dock) przez wtyczke
  "AP-28 Autopilot" (osobna paczka): klawisze steruja autopilotem i swieca zgodnie z jego stanem;
  panel laczy sie lokalnie z http://127.0.0.1:28650 (AP_CONFIG.link, enabled: false wylacza)

## 1.6.2

- VEM-72: czarna obudowa, licznik bebnowy ponizej osi wskazowki
- zielona kontrolka DEMPF u gory panelu: swieci, gdy tlumik odchylenia pracuje
  (wlaczony, w powietrzu, powyzej 60 kt); klik w kontrolke tez go wlacza / wylacza

Nowosci w 1.6.0 / 1.6.1 (przyciski w dwoch rzedach, napisy mieszcza sie w guzikach)
---------------
- lampka OPASN. VYS. (czerwona): radiowysokosciomierz pokazuje mniej niz ustawiony prog
  (domyslnie 60 m); kolko nad lampka zmienia prog o 10 m (Shift: 50 m), klik pokazuje prog
  i przestaje migac
- lampka ZAD. VYS. (bursztynowa, w trybie VYSOTA): swieci, gdy do zadanej wysokosci zostalo
  mniej niz 1000 ft, gasnie po dolocie; miga, gdy samolot odejdzie od niej o ponad 200 ft
- przycisk DEMPF: tlumik odchylenia - trymer steru kierunku utrzymuje zerowy slizg
  (kulka w srodku); dziala tez przy wylaczonym AP, w powietrzu powyzej 60 kt;
  nie dziala w trybie UPR. TRIMM RN (ten tryb uzywa juz trymera steru kierunku);
  jesli dziala w zla strone, sam to wykrywa i odwraca kierunek (AP_CONFIG.yd)

## 1.5.0

- przelacznik NA / OT w wierszu ARK - VOR
  - ARK, NA: lot na radiolatarnie NDB (jak dotad)
  - ARK, OT: lot od radiolatarni po linii ZPU; ZPU ustawia sie licznikiem obok
    (przy przelaczeniu na OT przyjmuje obecny namiar od radiolatarni)
  - VOR, NA: lot do stacji po linii OBS, z ktorejkolwiek strony stacji
  - VOR, OT: lot od stacji kursem OBS
  - po przelocie nad NDB / VOR przelacznik sam przechodzi na OT i samolot trzyma
    dotychczasowy kurs (wylaczasz to w AP_CONFIG.radio.autoFrom)

Nowosci w 1.4.0 / 1.4.1
---------------
- wysokosciomierz VEM-72 wbudowany w panel (w obu widokach, panel nie robi sie szerszy),
  przycisk VEM go chowa / pokazuje
  - jednostki z przycisku ED.: metry (1 obrot wskazowki = 1000 m, cisnienie w mm Hg)
    albo stopy (1 obrot = 1000 ft, cisnienie w hPa)
  - licznik bebnowy przewija sie plynnie jak w prawdziwym przyrzadzie
  - kolko nad okienkiem cisnienia: nastawa cisnienia +-1 (Shift +-10),
    klik w okienko: cisnienie lokalne (jak klawisz B)
  - pokazuje te sama wysokosc, co zrodlo AP_CONFIG.altSimVar

## 1.3.0

- strzalka na tarczy kursu obraca sie wokol srodka tarczy
- przyciski w naglowku okna (minimalizuj / odepnij / zamknij)
- panel skaluje sie razem z szerokoscia okna (w obie strony)
- zrodlo wysokosci do wyboru: AP_CONFIG.altSimVar
  ("INDICATED ALTITUDE" = wysokosciomierz 1, "INDICATED ALTITUDE:2" = wysokosciomierz 2,
   "PLANE ALTITUDE" = rzeczywista wysokosc nad poziomem morza)
- log diagnostyczny po wlaczeniu pokazuje wysokosci ze wszystkich zrodel i nastawy cisnienia

## 1.2.0

- wysokosc: klik w cyfre licznika wybiera krok strzalek (1 / 10 / 100 / 1000 / 10000),
  kolko nad cyfra zmienia te cyfre, Shift = krok x10
- przycisk ED. przelacza wyswietlanie wysokosci: stopy (FT) / metry (M)

## 1.1.0

- klik / przeciaganie na tarczy kursu ustawia kurs (kolko: +-1, Shift: +-10)
- przytrzymanie przyciskow strzalek zmienia wartosc ciagle, coraz szybciej
- NVU: trasa z EFB w MSFS 2024 (wspolrzedne punktow pobierane z bazy nawigacyjnej symulatora)

Uwagi
-----
- Nastawy autopilota: AP_CONFIG na poczatku pliku
  projekt\PackageSources\html_ui\InGamePanels\AP28Panel\AP28Panel.js (potem zbuduj od nowa).
- Log diagnostyczny: przytrzymaj bursztynowy wyswietlacz ok. 1,5 s.
- Nie zmieniaj plikow bezposrednio w Community - layout.json musi zgadzac sie z plikami,
  dlatego zmiany rob w projekcie i buduj od nowa.
