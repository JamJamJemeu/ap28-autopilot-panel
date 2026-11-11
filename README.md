# AP-28 Autopilot Panel

**MSFS 2024 toolbar panel: a Soviet-style autopilot for aircraft that have none (made for the An-28).**

**[English](#english) · [Polski](#polski) · [Русский](#русский)** · 📋 **[Changelog / Historia zmian / История изменений](CHANGELOG.md)**

| Soviet cockpit skin | AP-28L1 replica skin |
|---|---|
| ![Soviet cockpit skin](docs/panel-sov.jpg) | ![AP-28L1 replica skin](docs/panel-an28.jpg) |

---

## English

AP-28 Autopilot Panel is a toolbar panel for **Microsoft Flight Simulator 2024**. It flies the aircraft with its own autopilot logic, independent of the aircraft's systems. That way it works in aircraft with no autopilot, no VOR receiver and no autothrottle, such as the An-28. All labels are in Russian, like in a Soviet cockpit.

### Features

- **Autopilot modes**
  - АП (AP on/off)
  - ГОРИЗОНТ (wings level / emergency levelling)
  - КУРС (heading hold)
  - ВЫСОТА (altitude hold)
  - ВС (vertical speed)
  - НВУ (navigation)
  - Automatic disconnect, with КУРС-КРЕН and ТАНГАЖ warning lamps
- **ОГР. КРЕНА bank limit selector**: a Soviet-style rotary step switch, 10–30°, for turns in every mode. In the Soviet cockpit skin it sits next to the КУРС ЗАД. drum.
- **СНПС «Курс-С» landing system** (fictional, in Soviet style)
  - Power switch under a red guard cover, with a yellow lamp and a short self-test after switching on.
  - Nixie display with the airport ICAO code. АЭР previews nearby airports, ВВОД locks the airport (or АВТ for automatic choice).
  - ВПП drum: choose the runway of that airport. It stays active until you press ЗАХОД.
  - КПП course/glide-path indicator, distance (ДАЛЬН) and glide-path angle (ГЛИС) drums, ГОТОВ / КУРС / ГЛИС / ВПР lamps.
  - ЗАХОД: the autopilot flies to an entry point on the extended runway centreline, intercepts it at up to 30°, then captures the glide path from below. КУРС / НВУ go out when ЗАХОД takes over; ВЫСОТА / ВС go out at glide-path capture.
  - ПОСАДКА switch: ВПР (the autopilot disconnects at decision height) or АВТ (automatic landing with flare and throttle retard).
  - СКОР drum: sets the autothrottle speed.
  - КОНТР. ЛАМП lamp test button.
- **РИ-65 voice callouts** (Russian female voice) and switch, cover and button sounds.
- **НВУ navigation source switch** (ИСТ НВУ): МАРШ (route from the EFB, including SID/STAR points), АРК (ADF/NDB) or VOR.
- **Built-in virtual VOR receiver**
  - Finds stations in the sim's navigation database, then calculates radial and distance.
  - Receives ILS localizers (КРМ) too, with the course taken from the runway.
  - НА/ОТ (TO/FROM) switch, with automatic flip after station passage.
- **АТ autothrottle**
  - Holds indicated airspeed.
  - Disconnects when the pilot moves the throttle (Shift + click on АТ toggles this behaviour). Only the autothrottle disconnects; the autopilot keeps flying (`AP_CONFIG.throttleDisconnectsAP`).
  - Also disconnects on touchdown.
  - Engine limiter (ОГР): never exceeds engine RPM, N1, torque or propeller RPM limits.
- **ДЕМПФ yaw damper** (rudder trim).
- **ВЭМ-72 altimeter**
  - Feet or metres (ЕД. button).
  - Drum counter.
  - Pressure window in mmHg or hPa.
- **Altitude alerts**
  - ОПАСН. ВЫС. (radio altitude below a threshold)
  - ЗАД. ВЫС. (selected altitude alerter)
- **Value changes reset the lower digits**: e.g. changing the tens of 3977 gives 3980.
- **Two skins**: a generic Soviet cockpit panel, and a replica of the AP-28L1 control panel.
- **ПА-3 Планшет** (separate mod `ap28-pa3-planshet`, its own toolbar window): a paper map with a pen that draws the flight track, airports and runways from the sim database, and the СНПС approach centreline.
- **Optional companion plugin**: the panel can talk to an external stream-deck plugin over `http://127.0.0.1:28650`. The plugin is not part of this repository, and the panel works fine without it.

### Installation (ready package)

1. Download the latest ZIP from **[Releases](../../releases)**.
2. Find your **Community** folder. Open `UserCfg.opt` in Notepad:
   - Steam: `%APPDATA%\Microsoft Flight Simulator 2024\UserCfg.opt`
   - Microsoft Store: `%LOCALAPPDATA%\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\UserCfg.opt`

   The last line, `InstalledPackagesPath "..."`, plus `\Community` is your Community folder.
3. Copy both folders, `ap28-autopilot-panel` and `ap28-pa3-planshet`, into Community. Each `manifest.json` must be directly inside its folder, e.g. `Community\ap28-autopilot-panel\`. If you have the test folder `ap28-snps-kurs-s`, delete it.
4. Start the sim and load a flight. The panel is under the toolbar icon with an aircraft on a dial; ПА-3 has its own toolbar icon.

### Building from source

1. Edit the readable source `src/AP28Panel.js`.
2. Run `python tools/build_js.py`. It writes the game files `project/PackageSources/html_ui/InGamePanels/AP28Panel/AP28Panel.js` and `project/PackageSourcesPA3/html_ui/InGamePanels/AP28PA3/AP28PA3.js` (from `src/AP28PA3.js`), with non-ASCII characters escaped as `\uXXXX`.
3. In MSFS 2024, turn on Developer Mode. Then open **Project Editor → Open project → `project/ap28-autopilot-panel.xml`** and click **Build All in project**.
4. Copy `project/Packages/ap28-autopilot-panel` and `project/Packages/ap28-pa3-planshet` into your Community folder.

Settings such as PID gains, autothrottle and VOR options are in `AP_CONFIG` at the top of `src/AP28Panel.js`.

### Debug log

Hold the panel's text display for about 1.5 s to show the log under the panel. Double-click the display to put a marker (`ZNACZNIK n`) in the log. Engine and airframe exceedances are logged automatically (`AP_CONFIG.exceed`).

### License

© 2026 JamJam. **All rights reserved.** You may view the source code, and use the mod for personal use. You may not redistribute, modify or sell it without written permission. See [LICENSE.txt](LICENSE.txt) and [THIRD-PARTY.txt](THIRD-PARTY.txt) (the glyph outlines come from the DejaVu font; the voice was generated with Piper).

Microsoft Flight Simulator is a trademark of Microsoft. This mod is not affiliated with Microsoft.

---

## Polski

AP-28 Autopilot Panel to panel do paska narzędzi **Microsoft Flight Simulator 2024**. Steruje samolotem własnym autopilotem, niezależnym od systemów samolotu. Dzięki temu działa w maszynach bez autopilota, bez odbiornika VOR i bez automatu ciągu, np. w An-28. Wszystkie napisy są po rosyjsku, jak w radzieckiej kabinie.

### Funkcje

- **Tryby autopilota**
  - АП (włącz/wyłącz)
  - ГОРИЗОНТ (poziomowanie, także awaryjne)
  - КУРС (utrzymanie kursu)
  - ВЫСОТА (utrzymanie wysokości)
  - ВС (prędkość pionowa)
  - НВУ (nawigacja)
  - Automatyczne odłączenie z lampkami КУРС-КРЕН i ТАНГАЖ
- **Przełącznik ОГР. КРЕНА** (ograniczenie przechyłu): galetowy przełącznik w radzieckim stylu, 10–30°, dla zakrętów we wszystkich trybach. W radzieckim pulpicie jest obok bębenka КУРС ЗАД.
- **System lądowania СНПС «Курс-С»** (fikcyjny, w radzieckim stylu)
  - Włącznik pod czerwoną klapką zabezpieczającą, z żółtą lampką i krótkim testem po włączeniu.
  - Wyświetlacz nixie z kodem ICAO lotniska. АЭР przegląda pobliskie lotniska, ВВОД blokuje lotnisko (albo АВТ, wybór automatyczny).
  - Bębenek ВПП: wybór pasa na tym lotnisku. Działa, dopóki nie wciśniesz ЗАХОД.
  - Wskaźnik КПП (kurs i ścieżka), bębenki odległości (ДАЛЬН) i kąta ścieżki (ГЛИС), lampki ГОТОВ / КУРС / ГЛИС / ВПР.
  - ЗАХОД: autopilot leci na punkt wejścia na przedłużeniu osi pasa, przechwytuje oś pod kątem do 30°, potem łapie ścieżkę od dołu. КУРС / НВУ gasną, gdy ЗАХОД przejmuje sterowanie; ВЫСОТА / ВС gasną po złapaniu ścieżki.
  - Przełącznik ПОСАДКА: ВПР (autopilot wyłącza się na wysokości decyzji) albo АВТ (automatyczne lądowanie z wyrównaniem i zdjęciem gazu).
  - Bębenek СКОР: zadana prędkość automatu ciągu.
  - Przycisk КОНТР. ЛАМП (test lampek).
- **Informator głosowy РИ-65** (rosyjski kobiecy głos) oraz dźwięki przełączników, klapki i przycisków.
- **Przełącznik źródła НВУ** (ИСТ НВУ): МАРШ (trasa z EFB, także punkty SID/STAR), АРК (NDB) albo VOR.
- **Wbudowany wirtualny odbiornik VOR**
  - Szuka stacji w bazie nawigacyjnej symulatora, potem liczy radial i odległość.
  - Odbiera też ILS (КРМ), z kursem pasa.
  - Przełącznik НА/ОТ, z automatycznym przełączeniem po przelocie nad stacją.
- **АТ, automat ciągu**
  - Utrzymuje prędkość przyrządową.
  - Wyłącza się po ruszeniu przepustnicy (Shift + klik na АТ włącza lub wyłącza tę funkcję). Wyłącza się tylko АТ, autopilot leci dalej (`AP_CONFIG.throttleDisconnectsAP`).
  - Wyłącza się też po przyziemieniu.
  - Ogranicznik silnika (ОГР): nie przekracza limitów obrotów, N1, momentu ani obrotów śmigła.
- **ДЕМПФ**, tłumik odchylenia (trymer steru kierunku).
- **Wysokościomierz ВЭМ-72**
  - Stopy albo metry (przycisk ЕД.).
  - Licznik bębnowy.
  - Okienko ciśnienia w mm Hg albo hPa.
- **Sygnalizacja wysokości**
  - ОПАСН. ВЫС. (wysokość radiowa poniżej progu)
  - ЗАД. ВЫС. (zbliżanie się do zadanej wysokości)
- **Zmiana wartości zeruje niższe cyfry**: np. 3977, zmiana dziesiątek daje 3980.
- **Dwa wyglądy**: radziecki pulpit oraz replika pulpitu AP-28L1.
- **ПА-3 Планшет** (osobny mod `ap28-pa3-planshet`, własne okno na pasku narzędzi): papierowa mapa z rysikiem, który kreśli ślad lotu, lotniska i pasy z bazy gry oraz oś podejścia СНПС.
- **Opcjonalna współpraca z zewnętrzną wtyczką** do stream decka, przez `http://127.0.0.1:28650`. Wtyczki nie ma w tym repozytorium, a panel działa bez niej.

### Instalacja (gotowa paczka)

1. Pobierz najnowszy ZIP z **[Releases](../../releases)**.
2. Znajdź folder **Community**. Otwórz Notatnikiem `UserCfg.opt`:
   - Steam: `%APPDATA%\Microsoft Flight Simulator 2024\UserCfg.opt`
   - Microsoft Store: `%LOCALAPPDATA%\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\UserCfg.opt`

   Ostatnia linia, `InstalledPackagesPath "..."`, plus `\Community` to Twój folder Community.
3. Skopiuj oba foldery, `ap28-autopilot-panel` i `ap28-pa3-planshet`, do Community. Każdy `manifest.json` ma leżeć bezpośrednio w swoim folderze, np. `Community\ap28-autopilot-panel\`. Jeśli masz testowy folder `ap28-snps-kurs-s`, usuń go.
4. Uruchom grę i wczytaj lot. Panel jest pod ikoną tarczy z samolotem w pasku narzędzi; ПА-3 ma własną ikonę.

### Budowanie ze źródeł

1. Zmieniaj czytelne źródło `src/AP28Panel.js`.
2. Uruchom `python tools/build_js.py`. Skrypt zapisuje pliki dla gry `project/PackageSources/html_ui/InGamePanels/AP28Panel/AP28Panel.js` i `project/PackageSourcesPA3/html_ui/InGamePanels/AP28PA3/AP28PA3.js` (z `src/AP28PA3.js`), a znaki spoza ASCII zamienia na `\uXXXX`.
3. W MSFS 2024 włącz tryb dewelopera. Otwórz **Project Editor → Open project → `project/ap28-autopilot-panel.xml`** i kliknij **Build All in project**.
4. Skopiuj `project/Packages/ap28-autopilot-panel` i `project/Packages/ap28-pa3-planshet` do folderu Community.

Ustawienia, takie jak wzmocnienia PID, AT i VOR, są w `AP_CONFIG` na początku `src/AP28Panel.js`.

### Log diagnostyczny

Przytrzymaj wyświetlacz tekstowy panelu przez około 1,5 s, a pod panelem pojawi się log. Podwójny klik na wyświetlaczu wstawia do logu znacznik (`ZNACZNIK n`). Przekroczenia silnika i samolotu są zapisywane automatycznie (`AP_CONFIG.exceed`).

### Licencja

© 2026 JamJam. **Wszelkie prawa zastrzeżone.** Kod możesz oglądać, a moda używać na własny użytek. Bez pisemnej zgody autora nie wolno go rozpowszechniać, przerabiać ani sprzedawać. Szczegóły w [LICENSE.txt](LICENSE.txt) i [THIRD-PARTY.txt](THIRD-PARTY.txt) (kontury liter pochodzą z czcionki DejaVu, głos wygenerowano syntezatorem Piper).

Microsoft Flight Simulator jest znakiem towarowym firmy Microsoft. Mod nie jest z nią powiązany.

---

## Русский

AP-28 Autopilot Panel — панель для панели инструментов **Microsoft Flight Simulator 2024**. Она управляет самолётом собственным автопилотом, независимым от систем самолёта. Поэтому она работает на самолётах без автопилота, без приёмника VOR и без автомата тяги, например на Ан-28. Все надписи на русском языке, как в советской кабине.

### Возможности

- **Режимы автопилота**
  - АП (вкл/выкл)
  - ГОРИЗОНТ (приведение к горизонту, в том числе аварийное)
  - КУРС (стабилизация курса)
  - ВЫСОТА (стабилизация высоты)
  - ВС (вертикальная скорость)
  - НВУ (навигация)
  - Автоматическое отключение с табло КУРС-КРЕН и ТАНГАЖ
- **Переключатель ОГР. КРЕНА**: галетный переключатель в советском стиле, 10–30°, для разворотов во всех режимах. На советском пульте он стоит рядом с барабаном КУРС ЗАД.
- **Система посадки СНПС «Курс-С»** (вымышленная, в советском стиле)
  - Выключатель под красной защитной крышкой, с жёлтой лампой и коротким самоконтролем после включения.
  - Индикатор на газоразрядных лампах с кодом ICAO аэродрома. АЭР перебирает ближайшие аэродромы, ВВОД фиксирует аэродром (или АВТ — автоматический выбор).
  - Барабан ВПП: выбор полосы на этом аэродроме. Работает, пока не нажата кнопка ЗАХОД.
  - Прибор КПП (курс и глиссада), барабаны дальности (ДАЛЬН) и угла глиссады (ГЛИС), табло ГОТОВ / КУРС / ГЛИС / ВПР.
  - ЗАХОД: автопилот выводит самолёт в точку входа на продолжении оси ВПП, перехватывает ось под углом до 30°, затем захватывает глиссаду снизу. КУРС / НВУ гаснут, когда управление берёт ЗАХОД; ВЫСОТА / ВС гаснут после захвата глиссады.
  - Переключатель ПОСАДКА: ВПР (автопилот отключается на высоте принятия решения) или АВТ (автоматическая посадка с выравниванием и уборкой РУД).
  - Барабан СКОР: заданная скорость автомата тяги.
  - Кнопка КОНТР. ЛАМП (контроль ламп).
- **Речевой информатор РИ-65** (женский голос) и звуки переключателей, крышки и кнопок.
- **Переключатель источника НВУ** (ИСТ НВУ): МАРШ (маршрут из EFB, включая точки SID/STAR), АРК или VOR.
- **Встроенный виртуальный приёмник VOR**
  - Ищет станции в навигационной базе симулятора, затем вычисляет радиал и дальность.
  - Принимает также курсовые маяки ILS (КРМ), с курсом ВПП.
  - Переключатель НА/ОТ, с автоматическим переключением после пролёта станции.
- **АТ — автомат тяги**
  - Выдерживает приборную скорость.
  - Отключается при перемещении РУД (Shift + щелчок по АТ включает или выключает эту функцию). Отключается только АТ, автопилот продолжает работать (`AP_CONFIG.throttleDisconnectsAP`).
  - Отключается также при касании ВПП.
  - Ограничитель режима (ОГР): не превышает ограничений по оборотам, N1, крутящему моменту и оборотам винта.
- **ДЕМПФ** — демпфер рыскания (триммер руля направления).
- **Высотомер ВЭМ-72**
  - Футы или метры (кнопка ЕД.).
  - Барабанный счётчик.
  - Окно давления в мм рт. ст. или гПа.
- **Сигнализация высоты**
  - ОПАСН. ВЫС. (радиовысота ниже порога)
  - ЗАД. ВЫС. (подход к заданной высоте)
- **При изменении значения младшие разряды обнуляются**: например, 3977 при изменении десятков даёт 3980.
- **Два вида**: советский пульт и копия пульта АП-28Л1.
- **ПА-3 Планшет** (отдельный мод `ap28-pa3-planshet`, своё окно на панели инструментов): бумажная карта с пером, которое рисует траекторию полёта, аэродромы и полосы из базы симулятора и ось захода СНПС.
- **Необязательная связь с внешним плагином** для stream deck через `http://127.0.0.1:28650`. Плагина в этом репозитории нет, панель работает и без него.

### Установка (готовый пакет)

1. Скачайте последний ZIP в разделе **[Releases](../../releases)**.
2. Найдите папку **Community**. Откройте `UserCfg.opt` в Блокноте:
   - Steam: `%APPDATA%\Microsoft Flight Simulator 2024\UserCfg.opt`
   - Microsoft Store: `%LOCALAPPDATA%\Packages\Microsoft.Limitless_8wekyb3d8bbwe\LocalCache\UserCfg.opt`

   Последняя строка, `InstalledPackagesPath "..."`, плюс `\Community` — это ваша папка Community.
3. Скопируйте обе папки, `ap28-autopilot-panel` и `ap28-pa3-planshet`, в Community. Каждый `manifest.json` должен лежать прямо в своей папке, например `Community\ap28-autopilot-panel\`. Если у вас есть тестовая папка `ap28-snps-kurs-s`, удалите её.
4. Запустите симулятор и загрузите полёт. Панель открывается значком с самолётом на шкале на панели инструментов; у ПА-3 свой значок.

### Сборка из исходников

1. Изменяйте читаемый исходник `src/AP28Panel.js`.
2. Запустите `python tools/build_js.py`. Скрипт записывает файлы для игры `project/PackageSources/html_ui/InGamePanels/AP28Panel/AP28Panel.js` и `project/PackageSourcesPA3/html_ui/InGamePanels/AP28PA3/AP28PA3.js` (из `src/AP28PA3.js`), символы вне ASCII записываются как `\uXXXX`.
3. В MSFS 2024 включите режим разработчика. Откройте **Project Editor → Open project → `project/ap28-autopilot-panel.xml`** и нажмите **Build All in project**.
4. Скопируйте `project/Packages/ap28-autopilot-panel` и `project/Packages/ap28-pa3-planshet` в папку Community.

Настройки, такие как коэффициенты ПИД, АТ и VOR, находятся в `AP_CONFIG` в начале `src/AP28Panel.js`.

### Журнал отладки

Удерживайте текстовое табло панели около 1,5 с, и под панелью появится журнал. Двойной щелчок по табло ставит в журнале метку (`ZNACZNIK n`). Превышения по двигателям и самолёту записываются автоматически (`AP_CONFIG.exceed`).

### Лицензия

© 2026 JamJam. **Все права защищены.** Код можно просматривать, а мод — использовать в личных целях. Без письменного разрешения автора его нельзя распространять, изменять или продавать. Подробности в [LICENSE.txt](LICENSE.txt) и [THIRD-PARTY.txt](THIRD-PARTY.txt) (контуры букв взяты из шрифта DejaVu, голос создан синтезатором Piper).

Microsoft Flight Simulator — товарный знак Microsoft. Мод не связан с Microsoft.
