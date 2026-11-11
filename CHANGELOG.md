# Changelog · Historia zmian · История изменений

**[English](#english) · [Polski](#polski) · [Русский](#русский)**

Versions follow [Semantic Versioning](https://semver.org/). The ready-to-use package for each version is on the **Releases** page. The optional stream-deck companion plugin mentioned in some entries is not part of this repository.

---

## English

### 1.25.5 – 2026-11-11
Versions 1.18.2–1.25.4 were test builds and were not published; this entry covers all of them. The ZIP now contains two mods: `ap28-autopilot-panel` 1.25.5 and the new `ap28-pa3-planshet` 1.0.4.
#### Added
- **СНПС «Курс-С» landing system** (fictional, Soviet style), built into the panel:
  - Power switch under a red guard cover with a window showing its position, a yellow lamp above it and a ~3 s self-test after switching on.
  - Nixie display with the airport ICAO code. **АЭР** previews nearby airports (closest first, then АВТ); **ВВОД** locks the airport.
  - **ВПП** drum: choose the runway of that airport. It stays active after ВВОД and is locked only when ЗАХОД is pressed.
  - **КПП** course/glide-path indicator, **ДАЛЬН** distance and **ГЛИС** glide-path angle drums, ГОТОВ / КУРС / ГЛИС / ВПР lamps.
  - **ЗАХОД**: the autopilot flies to an entry point on the extended runway centreline (at least 6 NM out, further when higher), intercepts it at up to 30°, then captures the glide path from below. КУРС / НВУ go out when ЗАХОД takes over the lateral channel; ВЫСОТА / ВС stay on until the glide path is captured.
  - **ПОСАДКА ВПР / АВТ** switch: disconnect at decision height (60 m), or automatic landing with flare by radio altitude, throttle retard and disconnect on touchdown.
  - **СКОР** drum above the КПП: sets the autothrottle speed (dimmed, showing IAS, when АТ is off).
  - **КОНТР. ЛАМП** lamp test button.
  - The selected runway is exported as `L:AP28_SN_*` variables for ПА-3.
- **РИ-65 voice callouts** in a Russian female voice: course and glide-path capture, decision height, 30/20/10/5 m, autopilot off, automatic landing, touchdown. Plus sounds for the guard cover, switches and buttons. Played by the panel, or by the companion plugin as a fallback.
- **ПА-3 Планшет** (new separate mod `ap28-pa3-planshet`, its own toolbar window): a paper map with a pen drawing the flight track, airports and runways from the sim database, and the СНПС approach centreline.
#### Changed
- **Moving the throttle now disconnects only the autothrottle**; the autopilot keeps flying (`AP_CONFIG.throttleDisconnectsAP: false`). Moving the yoke no longer disconnects АТ.
- The ОГР. КРЕНА knob is more realistic, and in the Soviet cockpit skin it sits next to the КУРС ЗАД. drum.
- The Soviet cockpit skin is about 25% shorter, with the СНПС in one compact row.
#### Fixed
- Colours of some elements (ВЭМ dial, display, keys) changing in the sim after clicks: the panel uses far fewer colour gradients.

### 1.18.1 – 2026-11-10
#### Fixed
- In the Soviet cockpit skin, the ОГР. КРЕНА selector no longer sticks out of its frame. The field is taller, and the panel grows slightly at the bottom.

### 1.18.0 – 2026-11-10
#### Added
- **ОГР. КРЕНА bank limit selector.** A Soviet-style rotary step switch with a black bakelite pointer knob and an engraved scale of 10, 15, 20, 25 and 30°. It sets the maximum bank in turns in every mode: КУРС, НВУ and РАЗВОРОТЫ. Click a number to select it, click the knob to step to the next position, or use the mouse wheel. The display briefly shows `КРЕН 25°`, and the position is remembered.
- In the Soviet cockpit skin it sits between the display and the buttons. In the AP-28L1 skin it has its own ОГРАНИЧЕНИЕ КРЕНА plate under the autopilot console.
- Positions in `AP_CONFIG.bankSel`, default `AP_CONFIG.maxBank` (20°). Turn anticipation on the route uses the selected bank too.

#### Changed
- In the AP-28L1 skin, РАЗВОРОТЫ mode also uses the selected limit (previously fixed at 15°).

### 1.17.0 – 2026-11-09
#### Added
- **Exceedance recorder.** Every exceedance goes into the log with the time, value and flight state (IAS, altitude, throttle, AP/AT), to compare with Career mode penalties. Covered: engine RPM, N1, torque or propeller RPM above 100% of the aircraft's maximum, airspeed overspeed, stall warning, flap or gear speed exceeded, and g-load. The end of each event is logged too, with its duration and peak value. It works always, with or without AP and AT. Settings: `AP_CONFIG.exceed`.
- **Log marker: double-click the text display.** It writes `ZNACZNIK n` to the log with a snapshot of the aircraft and engines, and the display briefly shows `МЕТКА n`. Use it when the sim shows a penalty message, so the moment is easy to find in the log.

### 1.16.0 – 2026-11-09
#### Added
- **Engine limiter for АТ (ОГР).** АТ no longer pushes the engines past their limits, which earned overspeed penalties in Career mode. It watches engine RPM, turbine N1, torque and propeller RPM (as a percentage of the aircraft's maximum). Close to a limit it stops adding power, and above it pulls the throttle back.
- While the limiter is active, the display shows `АТ … ОГР` and the log says which parameter is limiting.
- Limits in `AP_CONFIG.at.limit`: `rpmPct` 97, `n1Pct` 98, `torquePct` 97, `propPct` 97 (0 = ignore), `gain`.

### 1.15.0 – 2026-11-08
#### Added
- **Moving the throttle disconnects the autopilot (АП ОТКЛ: РУД).** A lever movement of more than 5% since AP engagement turns AP off: an axis, several F2/F3 presses, or the mouse. A single small key tap is ignored.
- With АТ engaged, АТ detects the pilot's input and then disconnects both АТ and AP.
- Options: `AP_CONFIG.throttleDisconnectsAP` (on/off), `throttleApDiff` (sensitivity, default 0.05).

#### Fixed
- The source project's `project/PackageDefinitions/ap28-autopilot-panel.xml` was empty, so the project could not be built in Developer Mode. The ready package was not affected.

### 1.14.1 – 2026-11-08
#### Fixed
- **VOR and ILS stations are found again in MSFS 2024.** In MSFS 2024, nearest-station search results arrive in a separate event (`NearestSearchCompleted`), and the panel was waiting for them in the reply. The station list was always empty, so every VOR showed НЕТ СИГНАЛА. The panel now listens for that event.

### 1.14.0 – 2026-11-08
#### Added
- **The whole panel log can be saved to a file** (`ap28panel.log`) through the companion plugin. This works even with the in-game log window closed. Turn it off with `AP_CONFIG.fileLog = false`.

### 1.13.2 – 2026-11-08
#### Changed
- The regular VOR search runs again without a filter, because the ILS filter could hide every station in the game. ILS is searched in a separate session.

#### Added
- **VOR log every 5 s** (when ИСТ НВУ is on VOR): frequency, signal, number of stations in memory, nearest stations with their frequencies. Every search is logged too.

### 1.13.1 – 2026-11-07
#### Added
- **ILS from runway data.** When the frequency is in the ILS band (108.10–111.95, odd tenths) and the station search finds nothing, the panel checks airports within 40 NM. It takes the ILS from the runway data: frequency, antenna beyond the runway end, runway course.

### 1.13.0 – 2026-11-07
#### Fixed
- **Moving the throttle now disconnects АТ (АТ ОТКЛ: РУД).** АТ used to overwrite the pilot's input, so it never let go.

#### Added
- **Shift + click on АТ** turns this behaviour on or off (РУД ОТКЛ АТ: ВКЛ / ВЫКЛ). The setting is remembered.

### 1.12.0 – 2026-11-07
#### Changed
- **Changing a value resets the lower digits.** For example, changing the tens of 3977 gives 3980 or 3970, and changing the hundreds gives 4000 or 3900. This applies to altitude, heading, ЗК, VS, АТ speed, OBS/ЗПУ, frequencies, ВЭМ-72 pressure and the ОПАСН. ВЫС. threshold.

#### Removed
- The AP-28 app for the EFB tablet. The panel lives only in the toolbar.

### 1.11.0 – 2026-11-07
#### Added
- **The VOR receiver also receives ILS localizers (КРМ),** e.g. Rzeszów 110.30 (IRZ, runway 27). The КРМ course is fixed from the sim database and OBS does not change it. The display shows `КРМ IRZ 264`.
- Flying over the КРМ antenna (beyond the runway end) does not flip НА to ОТ.

### 1.10.0 – 2026-11-07
#### Added
- AP-28 app on the EFB tablet (removed again in 1.12.0).
- A lock so that two panel instances never control the aircraft at the same time.

### 1.9.0 – 2026-11-07
#### Added
- **ИСТ НВУ switch** (3 positions) in the АРК · VOR row: МАРШ (EFB route), АРК or VOR. It picks where НВУ takes its course from.
- **SID and STAR points** chosen in the EFB flight plan are part of the route (`AP_CONFIG.nav.useProcedures`). Legs without coordinates (climb to altitude, vectors) are skipped.

#### Removed
- The separate VOR button (replaced by the ИСТ НВУ switch).

### 1.8.0 – 2026-11-07
#### Added
- **Built-in VOR receiver.** The panel finds a station on the selected frequency in the sim's navigation database, then calculates radial and distance. It works in aircraft without a NAV radio, such as the An-28. `AP_CONFIG.radio.vorMode = "sim"` switches back to the aircraft's NAV1.
- **АТ autothrottle** (cyan button). It holds the current indicated airspeed. The mouse wheel over the button changes the speed (1 kt / 5 km/h, Shift ×10). A pilot lever movement or touchdown disconnects it.

### 1.7.0 – 2026-11-07
#### Added
- An optional link to an external stream-deck plugin over `http://127.0.0.1:28650` (`AP_CONFIG.link`). The panel works fine without it.

### 1.6.2 – 2026-11-07
#### Changed
- ВЭМ-72 gets a black case, and the drum counter moved below the needle hub.

#### Added
- A green ДЕМПФ annunciator at the top of the panel. It is lit while the yaw damper works.

### 1.6.0 – 2026-11-07
#### Added
- **ОПАСН. ВЫС. lamp** (red): radio altitude below the threshold (60 m by default). The mouse wheel over it changes the threshold by 10 m (Shift: 50 m).
- **ЗАД. ВЫС. lamp** (amber): less than 1000 ft to the selected altitude. It flashes when the aircraft drifts more than 200 ft away from it.
- **ДЕМПФ yaw damper:** the rudder trim keeps the slip ball centred. It also works with AP off, in the air above 60 kt, and corrects its own direction if it starts working the wrong way.

### 1.5.0 – 2026-11-07
#### Added
- **НА / ОТ switch** in the АРК · VOR row: fly to or from an NDB or a VOR on a set course (ЗПУ / OBS).
- After passing over the station, the switch flips to ОТ by itself (`AP_CONFIG.radio.autoFrom`).

### 1.4.0 – 2026-11-07
#### Added
- **ВЭМ-72 altimeter** built into the panel in both skins: metres or feet (ЕД. button), a smoothly rolling drum counter, and a pressure window in mmHg or hPa. The wheel adjusts the pressure, and a click sets local pressure.

### 1.3.0 – 2026-11-07
#### Added
- Window header buttons (minimise, undock, close).
- The panel scales with the window width.
- Altitude source can be chosen in `AP_CONFIG.altSimVar`.

#### Fixed
- The heading needle rotates around the centre of the dial.

### 1.2.0
#### Added
- Clicking a digit of the altitude counter sets the arrow step (1 / 10 / 100 / 1000 / 10000), and the wheel over a digit changes that digit.
- The ЕД. button switches altitude between feet and metres.

### 1.1.0
#### Added
- Click or drag on the heading dial sets the heading (wheel ±1, Shift ±10).
- Holding an arrow button changes the value continuously, faster and faster.
- НВУ follows the route from the MSFS 2024 EFB.

### 1.0.0
#### Added
- First release of the toolbar autopilot panel in a Soviet cockpit style, with its own autopilot independent of the aircraft.
- Modes: АП, ГОРИЗОНТ (wings level), КУРС (heading), ВЫСОТА (altitude hold), ВС (vertical speed), НВУ (navigation).
- Automatic disconnect with КУРС-КРЕН and ТАНГАЖ lamps.
- Two skins: a Soviet cockpit panel and a replica of the AP-28L1 control panel.

---

## Polski

### 1.25.5 – 2026-11-11
Wersje 1.18.2–1.25.4 były testowe i nie zostały opublikowane; ten wpis obejmuje je wszystkie. ZIP zawiera teraz dwa mody: `ap28-autopilot-panel` 1.25.5 i nowy `ap28-pa3-planshet` 1.0.4.
#### Dodane
- **System lądowania СНПС «Курс-С»** (fikcyjny, w radzieckim stylu), wbudowany w panel:
  - Włącznik pod czerwoną klapką z okienkiem pokazującym jego położenie, żółta lampka nad nim i ok. 3 s testu po włączeniu.
  - Wyświetlacz nixie z kodem ICAO lotniska. **АЭР** przegląda pobliskie lotniska (od najbliższego, na końcu АВТ); **ВВОД** blokuje lotnisko.
  - Bębenek **ВПП**: wybór pasa na tym lotnisku. Działa także po ВВОД, blokuje się dopiero po wciśnięciu ЗАХОД.
  - Wskaźnik **КПП** (kurs i ścieżka), bębenki **ДАЛЬН** (odległość) i **ГЛИС** (kąt ścieżki), lampki ГОТОВ / КУРС / ГЛИС / ВПР.
  - **ЗАХОД**: autopilot leci na punkt wejścia na przedłużeniu osi pasa (co najmniej 6 NM, dalej, gdy leci wyżej), przechwytuje oś pod kątem do 30°, potem łapie ścieżkę od dołu. КУРС / НВУ gasną, gdy ЗАХОД przejmuje kanał boczny; ВЫСОТА / ВС działają do złapania ścieżki.
  - Przełącznik **ПОСАДКА ВПР / АВТ**: wyłączenie na wysokości decyzji (60 m) albo automatyczne lądowanie z wyrównaniem wg wysokości radiowej, zdjęciem gazu i wyłączeniem po przyziemieniu.
  - Bębenek **СКОР** nad КПП: zadana prędkość automatu ciągu (przyciemniony, z prędkością przyrządową, gdy АТ jest wyłączony).
  - Przycisk **КОНТР. ЛАМП** (test lampek).
  - Wybrany pas trafia do zmiennych `L:AP28_SN_*` dla ПА-3.
- **Informator głosowy РИ-65** (rosyjski kobiecy głos): złapanie kursu i ścieżki, wysokość decyzji, 30/20/10/5 m, wyłączenie AP, automatyczne lądowanie, przyziemienie. Do tego dźwięki klapki, przełączników i przycisków. Odtwarza je panel, a zapasowo wtyczka stream decka.
- **ПА-3 Планшет** (nowy osobny mod `ap28-pa3-planshet`, własne okno): papierowa mapa z rysikiem, który kreśli ślad lotu, lotniska i pasy z bazy gry oraz oś podejścia СНПС.
#### Zmienione
- **Ruch przepustnicy wyłącza teraz tylko automat ciągu**, autopilot leci dalej (`AP_CONFIG.throttleDisconnectsAP: false`). Ruch sterownicą nie wyłącza już АТ.
- Gałka ОГР. КРЕНА jest bardziej realistyczna, a w radzieckim pulpicie stoi obok bębenka КУРС ЗАД.
- Radziecki pulpit jest o ok. 25% niższy, СНПС mieści się w jednym zwartym rzędzie.
#### Poprawione
- Zmiana kolorów niektórych elementów (tarcza ВЭМ, wyświetlacz, klawisze) w grze po kliknięciach: panel używa dużo mniej gradientów kolorów.

### 1.18.1 – 2026-11-10
#### Naprawiono
- W wyglądzie radzieckiego pulpitu przełącznik ОГР. КРЕНА nie wychodzi już poza ramkę. Pole jest wyższe, a panel nieco urósł na dole.

### 1.18.0 – 2026-11-10
#### Dodano
- **Przełącznik ОГР. КРЕНА, czyli ograniczenie przechylenia.** Galetowy przełącznik w radzieckim stylu: czarna bakelitowa gałka ze wskaźnikiem i grawerowana skala 10, 15, 20, 25 i 30°. Ustala maksymalny przechył w zakrętach we wszystkich trybach: КУРС, НВУ i РАЗВОРОТЫ. Klik w liczbę wybiera to położenie, klik w gałkę przestawia na następne, działa też kółko myszy. Na wyświetlaczu na chwilę widać `КРЕН 25°`, a ustawienie jest zapamiętywane.
- W wyglądzie radzieckiego pulpitu jest między wyświetlaczem a przyciskami. W wyglądzie AP-28L1 ma własną tabliczkę ОГРАНИЧЕНИЕ КРЕНА pod pulpitem autopilota.
- Położenia w `AP_CONFIG.bankSel`, domyślnie `AP_CONFIG.maxBank` (20°). Wyprzedzenie zakrętu na trasie też liczy się z wybranego przechyłu.

#### Zmieniono
- W wyglądzie AP-28L1 tryb РАЗВОРОТЫ też korzysta z wybranego ograniczenia (wcześniej stałe 15°).

### 1.17.0 – 2026-11-09
#### Dodano
- **Rejestrator przekroczeń.** Każde przekroczenie trafia do logu z godziną, wartością i stanem lotu (IAS, wysokość, gaz, AP/AT), żeby porównać je z karami kariery. Obejmuje: obroty silnika, N1, moment lub obroty śmigła powyżej 100% maksimum samolotu, przekroczenie prędkości, ostrzeżenie o przeciągnięciu, za dużą prędkość dla klap lub podwozia oraz przeciążenie. Koniec każdego zdarzenia też jest zapisywany, z czasem trwania i wartością szczytową. Działa zawsze, z AP i AT albo bez nich. Ustawienia: `AP_CONFIG.exceed`.
- **Znacznik w logu: podwójny klik na wyświetlaczu tekstowym.** Zapisuje do logu `ZNACZNIK n` ze stanem samolotu i silników, a na wyświetlaczu na chwilę widać `МЕТКА n`. Przydaje się, gdy gra pokaże komunikat o karze, bo łatwo potem znaleźć ten moment w logu.

### 1.16.0 – 2026-11-09
#### Dodano
- **Ogranicznik silnika dla АТ (ОГР).** АТ nie przekracza już limitów silników, za co w karierze były kary za zbyt wysokie obroty. Pilnuje obrotów silnika, N1 turbiny, momentu obrotowego i obrotów śmigła (w procentach maksimum samolotu). Blisko limitu przestaje dodawać mocy, a po przekroczeniu cofa przepustnicę.
- Gdy ogranicznik działa, na wyświetlaczu widać `АТ … ОГР`, a w logu, który parametr ogranicza.
- Limity w `AP_CONFIG.at.limit`: `rpmPct` 97, `n1Pct` 98, `torquePct` 97, `propPct` 97 (0 = pomiń), `gain`.

### 1.15.0 – 2026-11-08
#### Dodano
- **Ruch przepustnicą wyłącza autopilota (АП ОТКЛ: РУД).** Przesunięcie dźwigni o ponad 5% od włączenia AP wyłącza AP: osią, kilkoma wciśnięciami F2/F3 albo myszą. Pojedyncze, małe stuknięcie klawiszem jest ignorowane.
- Z włączonym АТ ruch pilota rozpoznaje АТ i wtedy wyłącza oba, АТ i AP.
- Opcje: `AP_CONFIG.throttleDisconnectsAP` (wł./wył.), `throttleApDiff` (czułość, domyślnie 0.05).

#### Naprawiono
- Plik `project/PackageDefinitions/ap28-autopilot-panel.xml` w projekcie źródłowym był pusty, więc projektu nie dało się zbudować w trybie dewelopera. Gotowej paczki to nie dotyczyło.

### 1.14.1 – 2026-11-08
#### Naprawiono
- **Stacje VOR i ILS znowu są znajdowane w MSFS 2024.** W MSFS 2024 wyniki szukania najbliższych stacji przychodzą osobnym zdarzeniem (`NearestSearchCompleted`), a panel czekał na nie w odpowiedzi. Lista stacji była zawsze pusta, więc każdy VOR pokazywał НЕТ СИГНАЛА. Teraz panel odbiera to zdarzenie.

### 1.14.0 – 2026-11-08
#### Dodano
- **Cały log panelu może się zapisywać do pliku** (`ap28panel.log`) przez wtyczkę towarzyszącą. Działa też przy zamkniętym oknie logu w grze. Wyłączenie: `AP_CONFIG.fileLog = false`.

### 1.13.2 – 2026-11-08
#### Zmieniono
- Zwykłe szukanie VOR znowu działa bez filtra, bo filtr dla ILS mógł w grze ukryć wszystkie stacje. ILS jest szukany w osobnej sesji.

#### Dodano
- **Log VOR co 5 s** (gdy ИСТ НВУ jest na VOR): częstotliwość, sygnał, liczba stacji w pamięci, najbliższe stacje z częstotliwościami. Każde wyszukiwanie też trafia do logu.

### 1.13.1 – 2026-11-07
#### Dodano
- **ILS z danych pasów.** Gdy częstotliwość jest z pasma ILS (108.10–111.95, nieparzyste dziesiąte), a szukanie stacji nic nie znalazło, panel sprawdza lotniska w promieniu 40 NM. ILS bierze z danych pasa: częstotliwość, antena za końcem pasa, kurs pasa.

### 1.13.0 – 2026-11-07
#### Naprawiono
- **Ruch przepustnicą wyłącza teraz АТ (АТ ОТКЛ: РУД).** Wcześniej АТ nadpisywał ruch pilota i nigdy nie puszczał.

#### Dodano
- **Shift + klik na АТ** włącza lub wyłącza to zachowanie (РУД ОТКЛ АТ: ВКЛ / ВЫКЛ). Ustawienie jest zapamiętywane.

### 1.12.0 – 2026-11-07
#### Zmieniono
- **Zmiana wartości zeruje niższe cyfry.** Na przykład zmiana dziesiątek przy 3977 daje 3980 albo 3970, a zmiana setek 4000 albo 3900. Dotyczy wysokości, kursu, ЗК, VS, prędkości АТ, OBS/ЗПУ, częstotliwości, ciśnienia ВЭМ-72 i progu ОПАСН. ВЫС.

#### Usunięto
- Aplikację AP-28 na tablecie EFB. Panel jest tylko w pasku narzędzi.

### 1.11.0 – 2026-11-07
#### Dodano
- **Odbiornik VOR łapie też ILS, czyli kursowe radiolatarnie (КРМ),** np. Rzeszów 110.30 (IRZ, pas 27). Kurs КРМ jest stały, z bazy symulatora, i OBS go nie zmienia. Na wyświetlaczu widać `КРМ IRZ 264`.
- Przelot nad anteną КРМ (za końcem pasa) nie przełącza НА na ОТ.

### 1.10.0 – 2026-11-07
#### Dodano
- Aplikacja AP-28 na tablecie EFB (usunięta w 1.12.0).
- Blokada, dzięki której dwa egzemplarze panelu nigdy nie sterują samolotem naraz.

### 1.9.0 – 2026-11-07
#### Dodano
- **Przełącznik ИСТ НВУ** (3 położenia) w wierszu АРК · VOR: МАРШ (trasa z EFB), АРК albo VOR. Wybiera, skąd НВУ bierze kierunek.
- **Punkty SID i STAR** wybrane w planie lotu EFB są częścią trasy (`AP_CONFIG.nav.useProcedures`). Odcinki bez współrzędnych (wznoszenie do wysokości, wektory) są pomijane.

#### Usunięto
- Osobny przycisk VOR (zastąpiony przełącznikiem ИСТ НВУ).

### 1.8.0 – 2026-11-07
#### Dodano
- **Wbudowany odbiornik VOR.** Panel sam szuka w bazie nawigacyjnej symulatora stacji na ustawionej częstotliwości, a potem liczy radial i odległość. Działa w samolotach bez radia NAV, np. w An-28. `AP_CONFIG.radio.vorMode = "sim"` przywraca radio NAV1 samolotu.
- **АТ, automat ciągu** (turkusowy przycisk). Utrzymuje obecną prędkość przyrządową. Kółko nad przyciskiem zmienia prędkość (1 kt / 5 km/h, Shift ×10). Ruch dźwigni przez pilota albo przyziemienie go wyłącza.

### 1.7.0 – 2026-11-07
#### Dodano
- Opcjonalne połączenie z zewnętrzną wtyczką do stream decka przez `http://127.0.0.1:28650` (`AP_CONFIG.link`). Panel działa bez niej.

### 1.6.2 – 2026-11-07
#### Zmieniono
- ВЭМ-72 ma czarną obudowę, a licznik bębnowy jest pod osią wskazówki.

#### Dodano
- Zielona kontrolka ДЕМПФ u góry panelu. Świeci, gdy tłumik odchylenia pracuje.

### 1.6.0 – 2026-11-07
#### Dodano
- **Lampka ОПАСН. ВЫС.** (czerwona): wysokość radiowa poniżej progu (domyślnie 60 m). Kółko nad lampką zmienia próg o 10 m (Shift: 50 m).
- **Lampka ЗАД. ВЫС.** (bursztynowa): do zadanej wysokości zostało mniej niż 1000 ft. Miga, gdy samolot odejdzie od niej o ponad 200 ft.
- **ДЕМПФ, tłumik odchylenia:** trymer steru kierunku trzyma kulkę w środku. Działa też przy wyłączonym AP, w powietrzu powyżej 60 kt, i sam poprawia kierunek działania, jeśli zaczyna działać odwrotnie.

### 1.5.0 – 2026-11-07
#### Dodano
- **Przełącznik НА / ОТ** w wierszu АРК · VOR: lot do albo od NDB lub VOR po zadanej linii (ЗПУ / OBS).
- Po przelocie nad stacją przełącznik sam przechodzi na ОТ (`AP_CONFIG.radio.autoFrom`).

### 1.4.0 – 2026-11-07
#### Dodano
- **Wysokościomierz ВЭМ-72** wbudowany w panel w obu wyglądach: metry albo stopy (przycisk ЕД.), płynnie przewijany licznik bębnowy i okienko ciśnienia w mm Hg albo hPa. Kółko zmienia ciśnienie, a klik ustawia ciśnienie lokalne.

### 1.3.0 – 2026-11-07
#### Dodano
- Przyciski w nagłówku okna (minimalizuj, odepnij, zamknij).
- Panel skaluje się razem z szerokością okna.
- Źródło wysokości do wyboru w `AP_CONFIG.altSimVar`.

#### Naprawiono
- Wskazówka kursu obraca się wokół środka tarczy.

### 1.2.0
#### Dodano
- Klik w cyfrę licznika wysokości wybiera krok strzałek (1 / 10 / 100 / 1000 / 10000), a kółko nad cyfrą zmienia tę cyfrę.
- Przycisk ЕД. przełącza wysokość między stopami a metrami.

### 1.1.0
#### Dodano
- Klik albo przeciąganie po tarczy kursu ustawia kurs (kółko ±1, Shift ±10).
- Przytrzymanie przycisku strzałki zmienia wartość ciągle, coraz szybciej.
- НВУ prowadzi po trasie z EFB w MSFS 2024.

### 1.0.0
#### Dodano
- Pierwsze wydanie panelu autopilota w pasku narzędzi, w stylu radzieckiego kokpitu, z własnym autopilotem niezależnym od samolotu.
- Tryby: АП, ГОРИЗОНТ (poziomowanie), КУРС (kurs), ВЫСОТА (utrzymanie wysokości), ВС (prędkość pionowa), НВУ (nawigacja).
- Automatyczne odłączenie z lampkami КУРС-КРЕН i ТАНГАЖ.
- Dwa wyglądy: radziecki pulpit i replika pulpitu AP-28L1.

---

## Русский

### 1.25.5 – 2026-11-11
Версии 1.18.2–1.25.4 были тестовыми и не публиковались; эта запись охватывает их все. В ZIP теперь два мода: `ap28-autopilot-panel` 1.25.5 и новый `ap28-pa3-planshet` 1.0.4.
#### Добавлено
- **Система посадки СНПС «Курс-С»** (вымышленная, в советском стиле), встроенная в панель:
  - Выключатель под красной крышкой с окошком, показывающим его положение, жёлтая лампа над ним и самоконтроль около 3 с после включения.
  - Индикатор на газоразрядных лампах с кодом ICAO аэродрома. **АЭР** перебирает ближайшие аэродромы (от ближайшего, в конце АВТ); **ВВОД** фиксирует аэродром.
  - Барабан **ВПП**: выбор полосы на этом аэродроме. Работает и после ВВОД, блокируется только после нажатия ЗАХОД.
  - Прибор **КПП** (курс и глиссада), барабаны **ДАЛЬН** (дальность) и **ГЛИС** (угол глиссады), табло ГОТОВ / КУРС / ГЛИС / ВПР.
  - **ЗАХОД**: автопилот выводит самолёт в точку входа на продолжении оси ВПП (не ближе 6 NM, дальше при большей высоте), перехватывает ось под углом до 30°, затем захватывает глиссаду снизу. КУРС / НВУ гаснут, когда ЗАХОД берёт боковой канал; ВЫСОТА / ВС работают до захвата глиссады.
  - Переключатель **ПОСАДКА ВПР / АВТ**: отключение на высоте принятия решения (60 м) или автоматическая посадка с выравниванием по радиовысоте, уборкой РУД и отключением после касания.
  - Барабан **СКОР** над КПП: заданная скорость автомата тяги (затемнён и показывает приборную скорость, когда АТ выключен).
  - Кнопка **КОНТР. ЛАМП** (контроль ламп).
  - Выбранная полоса передаётся в переменные `L:AP28_SN_*` для ПА-3.
- **Речевой информатор РИ-65** (женский голос): захват курса и глиссады, ВПР, 30/20/10/5 м, отключение АП, автоматическая посадка, касание. Также звуки крышки, переключателей и кнопок. Воспроизводит панель, а запасным путём — плагин stream deck.
- **ПА-3 Планшет** (новый отдельный мод `ap28-pa3-planshet`, своё окно): бумажная карта с пером, которое рисует траекторию полёта, аэродромы и полосы из базы симулятора и ось захода СНПС.
#### Изменено
- **Перемещение РУД теперь отключает только автомат тяги**, автопилот продолжает работать (`AP_CONFIG.throttleDisconnectsAP: false`). Движение штурвала больше не отключает АТ.
- Ручка ОГР. КРЕНА стала реалистичнее, а на советском пульте стоит рядом с барабаном КУРС ЗАД.
- Советский пульт стал ниже примерно на 25%, СНПС помещается в одном компактном ряду.
#### Исправлено
- Смена цвета некоторых элементов (шкала ВЭМ, табло, клавиши) в симуляторе после щелчков: панель использует гораздо меньше цветовых градиентов.

### 1.18.1 – 2026-11-10
#### Исправлено
- В виде советского пульта переключатель ОГР. КРЕНА больше не выходит за рамку. Поле стало выше, панель немного увеличилась снизу.

### 1.18.0 – 2026-11-10
#### Добавлено
- **Переключатель ОГР. КРЕНА — ограничение крена.** Галетный переключатель в советском стиле: чёрная бакелитовая ручка-указатель и гравированная шкала 10, 15, 20, 25 и 30°. Задаёт максимальный крен на разворотах во всех режимах: КУРС, НВУ и РАЗВОРОТЫ. Щелчок по цифре выбирает положение, щелчок по ручке переводит на следующее, работает и колесо мыши. На табло на мгновение появляется `КРЕН 25°`, положение запоминается.
- В виде советского пульта он находится между табло и кнопками. В виде АП-28Л1 у него своя панель ОГРАНИЧЕНИЕ КРЕНА под пультом автопилота.
- Положения в `AP_CONFIG.bankSel`, по умолчанию `AP_CONFIG.maxBank` (20°). Упреждение разворота на маршруте тоже считается по выбранному крену.

#### Изменено
- В виде АП-28Л1 режим РАЗВОРОТЫ тоже использует выбранное ограничение (раньше было постоянно 15°).

### 1.17.0 – 2026-11-09
#### Добавлено
- **Регистратор превышений.** Каждое превышение записывается в журнал со временем, значением и параметрами полёта (приборная скорость, высота, РУД, АП/АТ), чтобы сравнить его со штрафами в режиме карьеры. Учитываются: обороты двигателя, N1, крутящий момент или обороты винта выше 100% максимума самолёта, превышение скорости, предупреждение о сваливании, превышение скорости для закрылков или шасси и перегрузка. Окончание каждого события тоже записывается, с длительностью и пиковым значением. Работает всегда, с АП и АТ или без них. Настройки: `AP_CONFIG.exceed`.
- **Метка в журнале: двойной щелчок по текстовому табло.** Записывает в журнал `ZNACZNIK n` с параметрами самолёта и двигателей, а на табло на мгновение появляется `МЕТКА n`. Удобно, когда симулятор показывает сообщение о штрафе: этот момент потом легко найти в журнале.

### 1.16.0 – 2026-11-09
#### Добавлено
- **Ограничитель режима двигателя для АТ (ОГР).** АТ больше не выводит двигатели за ограничения, за что в режиме карьеры начислялись штрафы за превышение оборотов. Он следит за оборотами двигателя, N1 турбины, крутящим моментом и оборотами винта (в процентах от максимума самолёта). Вблизи ограничения перестаёт добавлять режим, а при превышении убирает РУД.
- Пока работает ограничитель, на табло видно `АТ … ОГР`, а в журнале — какой параметр ограничивает.
- Ограничения в `AP_CONFIG.at.limit`: `rpmPct` 97, `n1Pct` 98, `torquePct` 97, `propPct` 97 (0 = не учитывать), `gain`.

### 1.15.0 – 2026-11-08
#### Добавлено
- **Перемещение РУД отключает автопилот (АП ОТКЛ: РУД).** Сдвиг рычага более чем на 5% после включения АП выключает АП: осью, несколькими нажатиями F2/F3 или мышью. Одно короткое нажатие клавиши не учитывается.
- При включённом АТ вмешательство пилота распознаёт АТ и тогда отключает и АТ, и АП.
- Настройки: `AP_CONFIG.throttleDisconnectsAP` (вкл./выкл.), `throttleApDiff` (чувствительность, по умолчанию 0.05).

#### Исправлено
- Файл `project/PackageDefinitions/ap28-autopilot-panel.xml` в исходном проекте был пустым, поэтому проект нельзя было собрать в режиме разработчика. Готовый пакет это не затрагивало.

### 1.14.1 – 2026-11-08
#### Исправлено
- **Станции VOR и ILS снова находятся в MSFS 2024.** В MSFS 2024 результаты поиска ближайших станций приходят отдельным событием (`NearestSearchCompleted`), а панель ждала их в ответе. Список станций всегда был пуст, и любой VOR показывал НЕТ СИГНАЛА. Теперь панель принимает это событие.

### 1.14.0 – 2026-11-08
#### Добавлено
- **Весь журнал панели может записываться в файл** (`ap28panel.log`) через сопутствующий плагин. Работает и при закрытом окне журнала в игре. Отключение: `AP_CONFIG.fileLog = false`.

### 1.13.2 – 2026-11-08
#### Изменено
- Обычный поиск VOR снова работает без фильтра, потому что фильтр для ILS мог скрыть в игре все станции. ILS ищется в отдельном сеансе.

#### Добавлено
- **Журнал VOR каждые 5 с** (когда ИСТ НВУ на VOR): частота, сигнал, число станций в памяти, ближайшие станции с частотами. Каждый поиск тоже записывается.

### 1.13.1 – 2026-11-07
#### Добавлено
- **ILS по данным ВПП.** Если частота из диапазона ILS (108.10–111.95, нечётные десятые), а поиск станций ничего не нашёл, панель проверяет аэродромы в радиусе 40 NM. ILS берётся из данных ВПП: частота, антенна за торцом ВПП, курс ВПП.

### 1.13.0 – 2026-11-07
#### Исправлено
- **Перемещение РУД теперь отключает АТ (АТ ОТКЛ: РУД).** Раньше АТ перезаписывал действия пилота и не отключался.

#### Добавлено
- **Shift + щелчок по АТ** включает или выключает эту функцию (РУД ОТКЛ АТ: ВКЛ / ВЫКЛ). Настройка запоминается.

### 1.12.0 – 2026-11-07
#### Изменено
- **При изменении значения младшие разряды обнуляются.** Например, изменение десятков у 3977 даёт 3980 или 3970, а изменение сотен — 4000 или 3900. Относится к высоте, курсу, ЗК, ВС, скорости АТ, OBS/ЗПУ, частотам, давлению ВЭМ-72 и порогу ОПАСН. ВЫС.

#### Удалено
- Приложение АП-28 для планшета EFB. Панель есть только на панели инструментов.

### 1.11.0 – 2026-11-07
#### Добавлено
- **Приёмник VOR принимает и курсовые маяки ILS (КРМ),** например Жешув 110.30 (IRZ, ВПП 27). Курс КРМ постоянный, из базы симулятора, OBS его не меняет. На табло видно `КРМ IRZ 264`.
- Пролёт над антенной КРМ (за торцом ВПП) не переключает НА на ОТ.

### 1.10.0 – 2026-11-07
#### Добавлено
- Приложение АП-28 для планшета EFB (удалено в 1.12.0).
- Блокировка, чтобы два экземпляра панели никогда не управляли самолётом одновременно.

### 1.9.0 – 2026-11-07
#### Добавлено
- **Переключатель ИСТ НВУ** (3 положения) в строке АРК · VOR: МАРШ (маршрут из EFB), АРК или VOR. Определяет, откуда НВУ берёт направление.
- **Точки SID и STAR**, выбранные в плане полёта EFB, входят в маршрут (`AP_CONFIG.nav.useProcedures`). Участки без координат (набор до высоты, векторение) пропускаются.

#### Удалено
- Отдельная кнопка VOR (её заменил переключатель ИСТ НВУ).

### 1.8.0 – 2026-11-07
#### Добавлено
- **Встроенный приёмник VOR.** Панель сама находит в навигационной базе симулятора станцию на заданной частоте и вычисляет радиал и дальность. Работает на самолётах без радио NAV, например на Ан-28. `AP_CONFIG.radio.vorMode = "sim"` возвращает радио NAV1 самолёта.
- **АТ — автомат тяги** (бирюзовая кнопка). Выдерживает текущую приборную скорость. Колесо мыши над кнопкой меняет скорость (1 уз / 5 км/ч, Shift ×10). Перемещение РУД пилотом или касание ВПП его отключает.

### 1.7.0 – 2026-11-07
#### Добавлено
- Необязательная связь с внешним плагином для stream deck через `http://127.0.0.1:28650` (`AP_CONFIG.link`). Панель работает и без него.

### 1.6.2 – 2026-11-07
#### Изменено
- У ВЭМ-72 чёрный корпус, барабанный счётчик перенесён ниже оси стрелки.

#### Добавлено
- Зелёное табло ДЕМПФ вверху панели. Горит, пока работает демпфер рыскания.

### 1.6.0 – 2026-11-07
#### Добавлено
- **Табло ОПАСН. ВЫС.** (красное): радиовысота ниже порога (по умолчанию 60 м). Колесо мыши над табло меняет порог на 10 м (Shift: 50 м).
- **Табло ЗАД. ВЫС.** (жёлтое): до заданной высоты меньше 1000 ft. Мигает, если самолёт уходит от неё больше чем на 200 ft.
- **ДЕМПФ — демпфер рыскания:** триммер руля направления держит шарик в центре. Работает и при выключенном АП, в воздухе на скорости выше 60 уз, и сам исправляет направление действия, если оно оказалось обратным.

### 1.5.0 – 2026-11-07
#### Добавлено
- **Переключатель НА / ОТ** в строке АРК · VOR: полёт на или от NDB или VOR по заданной линии (ЗПУ / OBS).
- После пролёта станции переключатель сам переходит на ОТ (`AP_CONFIG.radio.autoFrom`).

### 1.4.0 – 2026-11-07
#### Добавлено
- **Высотомер ВЭМ-72**, встроенный в панель в обоих видах: метры или футы (кнопка ЕД.), плавно вращающийся барабанный счётчик и окно давления в мм рт. ст. или гПа. Колесо меняет давление, щелчок устанавливает местное давление.

### 1.3.0 – 2026-11-07
#### Добавлено
- Кнопки в заголовке окна (свернуть, открепить, закрыть).
- Панель масштабируется вместе с шириной окна.
- Источник высоты выбирается в `AP_CONFIG.altSimVar`.

#### Исправлено
- Стрелка курса вращается вокруг центра шкалы.

### 1.2.0
#### Добавлено
- Щелчок по разряду счётчика высоты выбирает шаг стрелок (1 / 10 / 100 / 1000 / 10000), колесо мыши над разрядом меняет этот разряд.
- Кнопка ЕД. переключает высоту между футами и метрами.

### 1.1.0
#### Добавлено
- Щелчок или перетаскивание по шкале курса задаёт курс (колесо ±1, Shift ±10).
- Удержание кнопки со стрелкой меняет значение непрерывно и всё быстрее.
- НВУ ведёт по маршруту из EFB в MSFS 2024.

### 1.0.0
#### Добавлено
- Первый выпуск панели автопилота для панели инструментов в стиле советской кабины, с собственным автопилотом, независимым от самолёта.
- Режимы: АП, ГОРИЗОНТ (приведение к горизонту), КУРС, ВЫСОТА (стабилизация высоты), ВС (вертикальная скорость), НВУ (навигация).
- Автоматическое отключение с табло КУРС-КРЕН и ТАНГАЖ.
- Два вида: советский пульт и копия пульта АП-28Л1.
