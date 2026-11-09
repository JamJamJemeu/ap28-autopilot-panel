// =====================================================================
//  AP-28 Autopilot Panel - panel autopilota do toolbara MSFS 2024
//  Copyright (c) 2026 JamJam (patrz LICENSE.txt). Wszelkie prawa zastrzezone. All rights reserved.
//
//  Funkcje: AP, GORIZONT (ratunkowe poziomowanie), KURS (HDG), VYSOTA (ALT HOLD), VS,
//           NVU (trasa z EFB / ARK-NDB / VOR), automatyczne odlaczenie z lampkami KURS-KREN i TANGAZ,
//           dwa wyglady: kabina radziecka oraz replika pulpitu AP-28L1 z samolotu An-28.
//
//  Zalozenia:
//   * wlasny autopilot, niezalezny od autopilota samolotu (dziala w samolotach bez AP),
//   * tryb boczny (LVL/HDG/NAV/BANK) + tryb pionowy (LVL/ALT/VS),
//   * kaskada: kurs -> zadany przechyl -> lotki, wysokosc -> zadany VS -> winda,
//   * regulatory PID z calka (anti-windup) i pochodna liczona z pomiaru,
//   * caly wyglad (tekstury, litery, galka) jest wbudowany w ten plik.
//
//  Kontury liter pochodza z czcionki DejaVu Sans Condensed Bold (licencja: patrz THIRD-PARTY.txt).
//  Wszystkie nastawy sa w AP_CONFIG ponizej.
// =====================================================================

const AP_CONFIG = {
    loopMs: 50,                 // okres petli sterowania [ms]

    // --- znaki osi (jesli ktoras os "ucieka", odwroc jej znak: 1 <-> -1) ---
    signBank: -1,               // PLANE BANK DEGREES: dodatni = lewy przechyl, wiec prawy = -raw
    signAileron: 1,             // dodatnie wyjscie = przechyl w prawo
    signElevator: 1,            // dodatnie wyjscie = wznoszenie

    // --- kurs (HDG) ---
    maxBank: 20,                // maks. zadany przechyl w HDG [deg]
    hdgBankGain: 1.5,           // [deg przechylu / deg bledu kursu]
    bankSlewHdg: 6,             // maks. tempo zmiany zadanego przechylu w HDG [deg/s]
    captureHeadingOnEngage: true, // true: po wcisnieciu HDG kurs = aktualny; false: uzyj ustawionego wczesniej

    // --- LVL (ratunkowe) ---
    bankSlewLvl: 20,            // [deg/s] szybsze wyprowadzanie przechylu
    vsSlewLvl: 1000,            // [fpm/s]

    // --- wysokosc (ALT HOLD) ---
    altToVS: 3,                 // [fpm na stope bledu wysokosci]
    maxAltVS: 800,              // maks. VS przy zlapaniu wysokosci [fpm]
    altLeadSec: 5,              // wyprzedzenie (tlumienie przelotu) [s]
    vsSlewAlt: 300,             // [fpm/s]

    // --- regulatory ---
    // kp: wzmocnienie, ki: calka, kd: pochodna (z pomiaru), iMax: limit wkladu calki,
    // window: calka dziala tylko gdy |blad| < window (zapobiega "nawijaniu" przy duzych manewrach)
    bank: { kp: 0.095, ki: 0.003,   kd: 0.009,   iMax: 0.3, window: 15,  dAlpha: 0.3 },
    vs:   { kp: 0.00011, ki: 0.00002, kd: 0.00027, iMax: 0.5, window: 600, dAlpha: 0.3 },

    allowOnGround: false,       // false: AP nie wlaczy sie na ziemi
    maxSelVS: 3000,             // limit wybieranego VS [fpm]

    // --- \u041d\u0412\u0423 (prowadzenie po trasie) ---
    nav: {
        interceptGain: 25,      // [deg kursu przechwycenia / NM odchylenia od trasy]
        maxIntercept: 30,       // maks. kat przechwycenia trasy [deg]
        directToXtk: 3,         // powyzej tylu NM od trasy: leci wprost do punktu
        seqMinNm: 0.3,          // minimalna odleglosc przelaczenia na nastepny punkt [NM]
        turnBank: 20,           // przechyl uzywany do wyliczenia wyprzedzenia zakretu [deg]
        skipNearNm: 0.5,        // przy wyborze punktu startowego pomija punkty blizsze niz tyle [NM]
        useProcedures: true,    // dolacz do trasy punkty SID i STAR wybrane w EFB
        loadWaitMs: 800         // czekanie na wczytanie planu z symulatora [ms]
    },

    // --- automatyczne odlaczenie AP (jak DPOR w AP-28L1): lampki KURS-KREN / TANGAZ ---
    alert: {                    // sygnalizacja wysokosci
        dangerHeightM: 60,      // OPASNAJA VYSOTA: domyslny prog z radiowysokosciomierza [m] (kolko nad lampka zmienia)
        dangerMaxFt: 2500,      // powyzej tej wysokosci radiowysokosciomierz nie mierzy [ft]
        altWindowFt: 1000,      // ZAD. VYS: lampka swieci, gdy do zadanej wysokosci zostalo mniej niz tyle [ft]...
        altDevFt: 200           // ...gasnie po dolocie na tyle; miga, gdy po zlapaniu odejdziesz dalej niz tyle [ft]
    },
    at: {                       // AT: automat ciagu - utrzymanie predkosci przyrzadowej przepustnica
        kp: 0.035, ki: 0.006, kd: 0.05, iMax: 0.6, window: 25, dAlpha: 0.2,   // [na wezel bledu predkosci]
        minThr: 0.0, maxThr: 1.0,   // zakres przepustnicy (0..1)
        slew: 0.12,             // maks. szybkosc ruchu przepustnicy [1/s]
        pilotOverride: true,    // ruszenie przepustnica (os, klawisze, mysz) wylacza AT; false = AT ignoruje ruchy dzwigni
        overrideDiff: 0.05,     // dzwignia rozni sie od ustawienia AT o tyle (0..1) -> pilot ja ruszyl
        overrideSum: 0.05,      // albo male ruchy (np. klawisze F2/F3) zsumowaly sie do tylu
        engines: 2,             // liczba silnikow (dzwigni) do ustawiania
        // ogranicznik silnika: AT nie przekroczy tych wartosci (procent maksimum wg danych samolotu).
        // Ustaw 0, zeby pominac dany parametr. Gdy ktorys jest przekroczony, AT cofa przepustnice.
        limit: {
            rpmPct: 97,         // obroty silnika, % maks. (GENERAL ENG PCT MAX RPM)
            n1Pct: 98,          // obroty sprezarki N1 turbiny, %
            torquePct: 97,      // moment obrotowy, % maks. (TURB ENG MAX TORQUE PERCENT)
            propPct: 97,        // obroty smigla, % maks. (PROP MAX RPM PERCENT)
            gain: 2.0           // o ile cofnac przepustnice na 1% przekroczenia (2.0 = 2%)
        }
    },
    yd: {                       // DEMPFER: tlumik odchylenia (trymer steru kierunku wg kata slizgu)
        kp: 0.06, ki: 0.04, kd: 0.03, iMax: 0.8, window: 8, dAlpha: 0.3,
        authority: 0.5,         // maks. wychylenie trymera steru kierunku od dempfera (0..1)
        minIasKt: 60,           // ponizej tej predkosci (i na ziemi) dempfer nie dziala [kt]
        sign: 1,                // kierunek dzialania; jesli slizg rosnie zamiast malec, zmien na -1...
        autoSign: true          // ...albo zostaw true: dempfer sam to wykryje i odwroci
    },
    disc: {
        maxBank: 45,            // przechyl powyzej [deg]...
        maxPitchUp: 25,         // tangaz w gore powyzej [deg]...
        maxPitchDn: 20,         // tangaz w dol powyzej [deg]...
        holdMs: 600,            // ...przez tyle ms -> odlaczenie
        stall: true,            // odlacz przy ostrzezeniu o przeciagnieciu (lampka TANGAZ)
        overspeed: true,        // odlacz przy przekroczeniu predkosci (lampka TANGAZ)
        yoke: true,             // odlacz, gdy pilot mocno ruszy wolantem (dziala w trybach z trymerami)
        yokeLevel: 0.35,        // wychylenie wolantu [0..1]...
        yokeMs: 400,            // ...przez tyle ms
        blinkMs: 6000           // lampka miga przez tyle ms, potem swieci ciagle (klik w lampke gasi)
    },

    // --- nawigacja radiowa: ARK (NDB) i VOR (radio NAV1 / ADF1 samolotu) ---
    radio: {
        adfPassLo: 60,          // przelot nad NDB: KUR spada ponizej tej wartosci [deg]...
        adfPassHi: 120,         // ...a potem rosnie ponad ta wartosc -> trzymaj kurs
        vorGainNoDme: 3,        // VOR bez DME: [deg przechwycenia / deg odchylenia od radialu]
        vorStationNm: 0.8,      // VOR z DME: blizej stacji leci po OBS bez poprawek [NM]
        adfGain: 2.5,           // ARK "OT": [deg przechwycenia / deg odchylenia od ZPU]
        vorMode: "virtual",     // "virtual": wlasny odbiornik VOR panelu (dziala w samolotach bez VOR, np. An-28); "sim": radio NAV1 samolotu
        vorRangeNm: 150,        // zasieg wlasnego odbiornika VOR [NM] (dodatkowo ograniczony horyzontem radiowym)
        autoFrom: true          // po przelocie nad NDB / VOR przelacznik sam przechodzi na "OT" i trzyma dotychczasowy kurs
    },
    skin: "sov",                // wyglad na starcie: "sov" (kabina radziecka) albo "an28" (pulpit AP-28L1); zmienia go przycisk VID (wybor jest zapamietywany)
    an: {                       // AP-28L1: zachowanie pulpitu
        readyDelayMs: 6000,     // po wlaczeniu PITANIE: czas do zapalenia lampki GOTOV [ms] (w prawdziwym AP-28L1: 10-100 s)
        knobStep: 10,           // przechyl na jedno polozenie galki RAZVOROT [deg] (3 polozenia = 30 deg)
        turnBank: 15,           // maks. przechyl w trybie RAZVOROTY (dowroty na kurs z ZK-2) [deg]
        climbRate: 250,         // tempo zmiany VS przy przytrzymaniu SPUSK/PODYEM [fpm/s]
        maxVS: 2000,            // limit VS z przelacznikow SPUSK/PODYEM [fpm]
        horizonHoldMs: 2500,    // jak dlugo ma byc poziomo, zanim po GORIZONT wlaczy sie KV [ms]
        trimWarnLevel: 0.7,     // lampki OT SEBYA / NA SEBYA: wyjscie windy powyzej tego progu...
        trimWarnMs: 4000        // ...przez tyle ms
    },
    autoScale: true,            // skin dopasowuje sie szerokoscia do okna panelu
    altSimVar: "INDICATED ALTITUDE",   // zrodlo wysokosci: "INDICATED ALTITUDE" (wysokosciomierz 1), "INDICATED ALTITUDE:2", "PLANE ALTITUDE" (rzeczywista MSL)
    showAltimeter: true,        // wysokosciomierz VEM-72 obok panelu (przycisk VEM wlacza / wylacza)
    trimElevatorRad: 0.44,      // tryb TRYMERY: pelne wychylenie trymera windy [rad]
    storagePrefix: "AP28.",     // prefiks zapamietanych ustawien
    // zapis calego logu do pliku ap28panel.log w folderze wtyczki Stream Panel (pl.jamjam.ap28.sdPlugin).
    // Dziala, gdy program Mad Doga z wtyczka jest uruchomiony (nawet przy wylaczonym \u0421\u0412\u042f\u0417\u042c).
    fileLog: true,

    // ruszenie przepustnica wylacza caly AP (os, klawisze F2/F3, mysz); false = AP nie reaguje na przepustnice
    throttleDisconnectsAP: true,
    throttleApDiff: 0.05,       // przesuniecie dzwigni (0..1) od chwili wlaczenia AP, ktore wylacza AP

    link: {                     // polaczenie z wtyczka AP-28 do Stream Panel GK150 / Stream Dock (klawisze na zewnetrznym panelu)
        enabled: true,
        url: "http://127.0.0.1:28650/ap28",   // tez probowane: http://localhost:28650/ap28, zapytania GET i fetch()
        periodMs: 150,          // co tyle ms wymiana stanu, gdy wtyczka odpowiada
        retryMs: 3000           // co tyle ms proba polaczenia, gdy wtyczka nie odpowiada
    }
};

function apClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function apWrap180(a) { a = (a + 180) % 360; if (a < 0) a += 360; return a - 180; }
function apWrap360(a) { a = a % 360; if (a < 0) a += 360; return a; }
// zmiana o krok z wyzerowaniem nizszych cyfr: 3977 +10 -> 3980, 3977 -10 -> 3970, 3980 +10 -> 3990
function apSnap(v, d) {
    if (!d || !isFinite(v)) return v + (d || 0);
    const s = Math.abs(d), q = v / s, k = Math.round(d / s);
    return (d > 0 ? Math.floor(q + 1e-6) + k : Math.ceil(q - 1e-6) + k) * s;
}
function apSlew(cur, target, maxStep) {
    const d = target - cur;
    return Math.abs(d) <= maxStep ? target : cur + Math.sign(d) * maxStep;
}

// ---------------------------------------------------------------------
//  Geometria (kula ziemska): kierunek, odleglosc, odchylenie od trasy [NM]
//  Punkty to obiekty {lat, lon} w stopniach.
// ---------------------------------------------------------------------
const AP_R_NM = 3440.065;
function apRad(d) { return d * Math.PI / 180; }
function apDeg(r) { return r * 180 / Math.PI; }
function apBrg(a, b) {                   // kierunek rzeczywisty a -> b [deg]
    const p1 = apRad(a.lat), p2 = apRad(b.lat), dl = apRad(b.lon - a.lon);
    const y = Math.sin(dl) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (apDeg(Math.atan2(y, x)) + 360) % 360;
}
function apDst(a, b) {                   // odleglosc a - b [NM]
    const p1 = apRad(a.lat), p2 = apRad(b.lat), dp = p2 - p1, dl = apRad(b.lon - a.lon);
    const h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * AP_R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}
function apDest(a, brg, dNm) {           // punkt w odleglosci dNm [NM] od a w kierunku brg (rzeczywistym)
    const d = dNm / AP_R_NM, t = apRad(brg), p1 = apRad(a.lat), l1 = apRad(a.lon);
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t));
    const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return { lat: apDeg(p2), lon: ((apDeg(l2) + 540) % 360) - 180 };
}
function apXtk(a, b, p) {                // odchylenie p od trasy a -> b [NM], dodatnie = na prawo od trasy
    const d13 = apDst(a, p) / AP_R_NM;
    const t13 = apRad(apBrg(a, p)), t12 = apRad(apBrg(a, b));
    return Math.asin(apClamp(Math.sin(d13) * Math.sin(t13 - t12), -1, 1)) * AP_R_NM;
}

// ---------------------------------------------------------------------
//  Regulator PID: calka z anti-windup, pochodna z pomiaru (bez "kopniaka"
//  przy zmianie wartosci zadanej), filtr dolnoprzepustowy pochodnej.
// ---------------------------------------------------------------------
class ApPID {
    constructor(cfg) {
        this.cfg = cfg;
        this.reset();
    }
    reset() {
        this.i = 0;
        this.lastMeas = null;
        this.dFilt = 0;
    }
    // error: blad; meas: pomiar (do pochodnej); wrap: czy pomiar jest katem (zawijanie +-180)
    update(error, meas, dt, wrap) {
        const c = this.cfg;
        if (c.ki > 0) {
            // poza oknem blad nie "nawija" calki dalej, ale pozwala ja odwijac (inaczej regulator utyka)
            const lim = c.iMax / c.ki;
            const windingUp = Math.abs(error) >= c.window && error * this.i > 0;
            if (!windingUp) this.i = apClamp(this.i + error * dt, -lim, lim);
        }
        let d = 0;
        if (this.lastMeas !== null) {
            let delta = meas - this.lastMeas;
            if (wrap) delta = apWrap180(delta);
            this.dFilt += ((delta / dt) - this.dFilt) * c.dAlpha;
            d = this.dFilt;
        }
        this.lastMeas = meas;
        return apClamp(c.kp * error + c.ki * this.i - c.kd * d, -1, 1);
    }
}


// ---------------------------------------------------------------------
//  SKIN: radziecka kabina (turkusowa farba, czarna plyta, zolte soczewki-klawisze)
//  Wszystkie napisy to wektory SVG (nie zaleza od czcionek w grze - cyrylica dziala zawsze).
//  Napisy do edycji: AP_LABELS (dozwolone: A-Ya, A-Z, cyfry, - + . , : / i kropka srodkowa).
// ---------------------------------------------------------------------
const AP_SKIN_WIDTH = 620;

const AP_LABELS = {
    title: "\u0410\u0412\u0422\u041e\u041f\u0418\u041b\u041e\u0422",                 // AUTOPILOT
    ap: "\u0410\u041f", apSub: "\u0412\u041a\u041b",             // AP / ON
    lvl: "\u0413\u041e\u0420\u0418\u0417\u041e\u041d\u0422",                    // LVL (horizon)
    hdg: "\u041a\u0423\u0420\u0421",                        // HDG (course)
    alt: "\u0412\u042b\u0421\u041e\u0422\u0410",                      // ALT (altitude)
    vs: "\u0412\u0421",                           // VS (vertical speed)
    nvu: "\u041d\u0412\u0423",                         // NAV (route following)
    hdgGroup: "\u041a\u0423\u0420\u0421 \u0417\u0410\u0414.",              // selected heading
    altGroup: "\u0412\u042b\u0421\u041e\u0422\u0410, \u0424\u0422",             // selected altitude, ft
    altGroupM: "\u0412\u042b\u0421\u041e\u0422\u0410, \u041c",             // selected altitude, m
    m: "\u041c", unit: "\u0415\u0414.",                // meters / units
    vem: "\u0412\u042d\u041c", vemType: "\u0412\u042d\u041c-72",      // altimeter VEM-72
    vemAlt: "\u0412\u042b\u0421\u041e\u0422\u0410", vemMetr: "\u041c\u0415\u0422\u0420", vemFt: "\u0424\u0423\u0422", vemMm: "\u041c\u041c", vemHpa: "\u0413\u041f\u0410",   // altitude, meters, feet, mmHg, hPa
    vsGroup: "\u0412\u0415\u0420\u0422. \u0421\u041a\u041e\u0420.",             // selected vertical speed
    navGroup: "\u041d\u0412\u0423 \u00b7 \u041c\u0410\u0420\u0428\u0420\u0423\u0422",          // NAV route group
    wp: "\u041f\u0423\u041d\u041a\u0422", dist: "\u0414\u0418\u0421\u0422, \u041c\u0418\u041b\u042c", crs: "\u0417\u041f\u0423", xtk: "\u0411\u0423, \u041c\u0418\u041b\u042c",  // waypoint, distance NM, course, cross-track
    load: "\u0417\u0410\u0413\u0420",                       // load route
    noRoute: "\u041d\u0415\u0422 \u041c\u0410\u0420\u0428\u0420\u0423\u0422\u0410", loading: "\u0417\u0410\u0413\u0420\u0423\u0417\u041a\u0410", routeEnd: "\u041c\u0410\u0420\u0428\u0420\u0423\u0422 \u041e\u041a\u041e\u041d\u0427\u0415\u041d",
    radioGroup: "\u0410\u0420\u041a \u00b7 VOR",            // radio navigation group
    srcCap: "\u0418\u0421\u0422 \u041d\u0412\u0423",                 // NAV source selector
    src: "\u0418\u0421\u0422", srcNames: { RTE: "\u041c\u0410\u0420\u0428", ADF: "\u0410\u0420\u041a", VOR: "VOR" },   // source: route / NDB / VOR
    freq: "\u0427\u0410\u0421\u0422", obs: "\u041e\u0411\u0421", kur: "\u041a\u0423\u0420", rad: "\u0420\u0410\u0414\u0418\u0410\u041b",           // frequency, OBS, relative bearing, radial
    lampRoll: "\u041a\u0423\u0420\u0421-\u041a\u0420\u0415\u041d", lampPitch: "\u0422\u0410\u041d\u0413\u0410\u0416",                     // disconnect lamps
    lampDanger: "\u041e\u041f\u0410\u0421\u041d. \u0412\u042b\u0421.", lampAlt: "\u0417\u0410\u0414. \u0412\u042b\u0421.", lampYd: "\u0414\u0415\u041c\u041f\u0424",  // danger height / selected altitude / yaw damper
    vorKey: "VOR", at: "\u0410\u0422", atOff: "\u0410\u0422 \u041e\u0422\u041a\u041b", atPilot: "\u0410\u0422 \u041e\u0422\u041a\u041b: \u0420\u0423\u0414", atLim: "\u041e\u0413\u0420", atOvr: "\u0420\u0423\u0414 \u041e\u0422\u041a\u041b \u0410\u0422: ", on: "\u0412\u041a\u041b", off: "\u0412\u042b\u041a\u041b", kt: "\u0423\u0417", kmh: "\u041a\u041c/\u0427",   // VOR / autothrottle
    vorNone: "\u041d\u0415\u0422 \u0421\u0422\u0410\u041d\u0426\u0418\u0418", krm: "\u041a\u0420\u041c", // no VOR station / KRM = localizer (kursowa radiolatarnia ILS)
    yd: "\u0414\u0415\u041c\u041f\u0424", ydSign: "\u0414\u0415\u041c\u041f\u0424: \u0417\u041d\u0410\u041a \u0418\u0417\u041c\u0415\u041d\u0415\u041d", ydBusy: "\u0414\u0415\u041c\u041f\u0424: \u0422\u0420\u0418\u041c\u041c \u0420\u041d \u0417\u0410\u041d\u042f\u0422",   // yaw damper
    discRoll: "\u0410\u041f \u041e\u0422\u041a\u041b: \u041a\u0420\u0415\u041d", discPitch: "\u0410\u041f \u041e\u0422\u041a\u041b: \u0422\u0410\u041d\u0413\u0410\u0416", discYoke: "\u0410\u041f \u041e\u0422\u041a\u041b: \u0428\u0422\u0423\u0420\u0412\u0410\u041b",
    discStall: "\u0410\u041f \u041e\u0422\u041a\u041b: \u0421\u0412\u0410\u041b\u0418\u0412\u0410\u041d\u0418\u0415", discOver: "\u0410\u041f \u041e\u0422\u041a\u041b: \u0421\u041a\u041e\u0420\u041e\u0421\u0422\u042c",
    noSignal: "\u041d\u0415\u0422 \u0421\u0418\u0413\u041d\u0410\u041b\u0410", ndbPass: "\u041f\u0420\u041e\u041b\u0415\u0422 \u041f\u0420\u0418\u0412\u041e\u0414\u0410", vorPass: "\u041f\u0420\u041e\u041b\u0415\u0422 VOR", toFrom: ["\u041d\u0410", "\u041e\u0422"],   // NDB / VOR passage, TO / FROM
    apOn: "\u0410\u041f \u0412\u041a\u041b", apOff: "\u0410\u041f \u0412\u042b\u041a\u041b",   // AP on / off
    apThr: "\u0410\u041f \u041e\u0422\u041a\u041b: \u0420\u0423\u0414",              // AP wylaczony ruchem przepustnicy
    lockOther: "\u0410\u041f: \u0414\u0420\u0423\u0413\u041e\u0415 \u041e\u041a\u041d\u041e",       // steruje drugi egzemplarz panelu (toolbar / EFB)
    shortLvl: "\u0413\u041e\u0420", shortHdg: "\u041a\u0423\u0420\u0421", shortAlt: "\u0412\u042b\u0421", shortVs: "\u0412\u0421",
    ft: "\u0424\u0422", ground: "\u041d\u0410 \u0417\u0415\u041c\u041b\u0415",       // ft / on ground
    ctl: "\u0423\u041f\u0420",                         // controls
    ctlModes: ["\u0422\u0420\u0418\u041c\u041c\u0415\u0420\u042b", "\u0420\u0423\u041b\u0418", "\u0422\u0420\u0418\u041c\u041c \u0420\u041d"],  // trims / surfaces / rudder trim
    an: {                               // pulpit AP-28L1
        title: "\u0410\u0412\u0422\u041e\u041f\u0418\u041b\u041e\u0422", ready: "\u0413\u041e\u0422\u041e\u0412", on: "\u0412\u041a\u041b\u042e\u0427\u0415\u041d", turn: "\u0420\u0410\u0417\u0412\u041e\u0420\u041e\u0422", left: "\u041b", right: "\u041f",
        autotrim: "\u0410\u0412\u0422\u041e\u0422\u0420\u0418\u041c", power: "\u041f\u0418\u0422\u0410\u041d\u0418\u0415", engage: "\u0412\u041a\u041b\u042e\u0427\u0415\u041d\u0418\u0415", ap: "\u0410\u041f",
        stab: "\u0421\u0422\u0410\u0411\u0418\u041b\u0418\u0417", gik: "\u0413\u0418\u041a", gpk: "\u0413\u041f\u041a", turns: "\u0420\u0410\u0417\u0412\u041e\u0420\u041e\u0422\u042b", pitch: "\u0422\u0410\u041d\u0413\u0410\u0416",
        enabled: "\u0412\u041a\u041b\u042e\u0427\u0415\u041d\u041e", disabled: "\u041e\u0422\u041a\u041b\u042e\u0427\u0415\u041d\u041e", descent: "\u0421\u041f\u0423\u0421\u041a", climb: "\u041f\u041e\u0414\u042a\u0415\u041c",
        fwd: "\u041e\u0422 \u0421\u0415\u0411\u042f", back: "\u041d\u0410 \u0421\u0415\u0411\u042f", horizon: "\u0413\u041e\u0420\u0418\u0417\u041e\u041d\u0422", kv: "\u041a\u0412",
        sideTitle: "\u0417\u0410\u0414\u0410\u0422\u0427\u0418\u041a\u0418", zk: "\u0417\u041a-2 \u00b7 \u041a\u0423\u0420\u0421", cws: "\u0421\u041e\u0412\u041c. \u0423\u041f\u0420.", off: "\u041e\u0422\u041a\u041b. \u0410\u041f",
        pwrOff: "\u041f\u0418\u0422\u0410\u041d\u0418\u0415 \u0412\u042b\u041a\u041b", warm: "\u041f\u0420\u041e\u0413\u0420\u0415\u0412", cwsTxt: "\u0421\u041e\u0412\u041c. \u0423\u041f\u0420.",
        bank: "\u041a\u0420\u0415\u041d", shGik: "\u0413\u0418\u041a", shGpk: "\u0413\u041f\u041a", shTurn: "\u0420\u0410\u0417\u0412", shPitch: "\u0422\u0410\u041d\u0413", shKv: "\u041a\u0412", shLvl: "\u0413\u041e\u0420",
        notReady: "\u041d\u0415 \u0413\u041e\u0422\u041e\u0412", knob: "\u0420\u0423\u041a\u041e\u042f\u0422\u041a\u0410 \u041d\u0415 \u0412 0", lock: "\u0420\u0423\u041a. \u0412 0 \u0418 \u0412\u041a\u041b. \u0410\u041f"
    }
};

// tekstury (PNG, base64): ziarno farby, matowa plyta, zuzycie obudowy i plyty
const AP_TEX = {"paint":"data:image/png;base64,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","plate":"data:image/png;base64,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","wearBody":"data:image/png;base64,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","wearPlate":"data:image/png;base64,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"};

// kontury liter: [szerokosc, sciezka] w ukladzie 1000 jedn./em, os Y w dol, linia bazowa y=0
const AP_GLYPHS = {"\u00d7":[754,"M642 -525 451 -313 642 -102 568 -20 377 -231 187 -20 112 -102 303 -313 112 -525 187 -607 377 -395 568 -607Z"],"\u0410":[696,"M481 -133H216L174 0H4L248 -729H449L692 0H522ZM258 -268H438L349 -558Z"],"\u0411":[686,"M351 -128Q404 -128 428 -150Q454 -174 454 -219Q454 -264 428 -287Q405 -309 351 -309H252V-128ZM363 0H83V-729H579V-587H252V-451H363Q488 -451 559 -394Q623 -342 623 -225Q623 -109 559 -57Q488 0 363 0Z"],"\u0412":[686,"M345 -447Q385 -447 406 -466Q427 -486 427 -524Q427 -562 406 -581Q385 -601 345 -601H252V-447ZM351 -128Q402 -128 428 -152Q454 -176 454 -224Q454 -271 428 -295Q402 -319 351 -319H252V-128ZM508 -390Q563 -373 593 -325Q623 -278 623 -209Q623 -104 558 -52Q494 0 363 0H83V-729H336Q473 -729 534 -683Q596 -637 596 -536Q596 -483 573 -446Q551 -408 508 -390Z"],"\u0413":[573,"M83 0V-729H549V-587H252V0Z"],"\u0414":[801,"M303 -142H485V-587H344V-542Q344 -230 303 -142ZM104 -142Q149 -176 162 -225Q174 -275 174 -591V-729H655V-142H748V157H620V0H182V157H54V-142Z"],"\u0415":[615,"M83 -729H539V-587H252V-451H522V-309H252V-142H549V0H83Z"],"\u0416":[1102,"M13 0 282 -437 42 -729H219L466 -428V-729H635V-428L882 -729H1060L820 -437L1088 0H902L714 -307L635 -212V0H466V-212L388 -307L200 0Z"],"\u0417":[639,"M445 -393Q511 -374 546 -327Q580 -280 580 -207Q580 -99 505 -42Q431 14 274 14Q209 14 158 5Q107 -4 60 -22V-167Q107 -141 154 -127Q200 -114 268 -114Q339 -114 375 -140Q411 -166 411 -214Q411 -264 374 -289Q337 -315 253 -315H172V-436H256Q333 -436 364 -458Q396 -480 396 -526Q396 -568 365 -591Q335 -614 275 -614Q213 -614 159 -602Q104 -590 74 -573V-711Q104 -722 168 -732Q233 -742 274 -742Q418 -742 491 -696Q564 -649 564 -555Q564 -491 534 -450Q504 -410 445 -393Z"],"\u0418":[753,"M670 -729V0H510V-500L271 0H83V-729H243V-229L481 -729Z"],"\u0419":[753,"M670 -729V0H510V-500L271 0H83V-729H243V-229L481 -729ZM214 -927H277Q286 -897 307 -883Q329 -868 362 -868Q396 -868 417 -883Q438 -897 447 -927H510Q502 -864 465 -831Q427 -798 362 -798Q297 -798 259 -831Q221 -864 214 -927Z"],"\u041a":[735,"M83 -729H252V-428L517 -729H708L447 -434L723 0H536L339 -311L252 -212V0H83Z"],"\u041b":[747,"M42 0V-142Q153 -156 175 -237Q198 -317 198 -591V-729H665V0H496V-587H367V-542Q367 -275 324 -151Q282 -27 42 0Z"],"\u041c":[896,"M83 -729H298L447 -339L598 -729H812V0H652V-533L501 -140H394L243 -533V0H83Z"],"\u041d":[753,"M83 -729H252V-451H501V-729H670V0H501V-309H252V0H83Z"],"\u041e":[765,"M382 -606Q305 -606 262 -542Q220 -479 220 -364Q220 -249 262 -186Q305 -122 382 -122Q460 -122 503 -186Q545 -249 545 -364Q545 -479 503 -542Q460 -606 382 -606ZM382 -742Q541 -742 630 -642Q720 -541 720 -364Q720 -187 630 -86Q541 14 382 14Q225 14 135 -86Q45 -187 45 -364Q45 -541 135 -642Q225 -742 382 -742Z"],"\u041f":[753,"M670 -729V0H501V-587H252V0H83V-729Z"],"\u0420":[659,"M83 -729H363Q489 -729 556 -667Q623 -605 623 -491Q623 -376 556 -315Q489 -253 363 -253H252V0H83ZM252 -593V-389H345Q395 -389 421 -416Q448 -442 448 -491Q448 -540 421 -566Q395 -593 345 -593Z"],"\u0421":[660,"M603 -40Q556 -13 506 0Q455 14 400 14Q236 14 141 -88Q45 -189 45 -364Q45 -539 141 -640Q236 -742 400 -742Q455 -742 506 -729Q556 -715 603 -688V-537Q556 -573 510 -589Q464 -606 414 -606Q323 -606 271 -542Q220 -477 220 -364Q220 -251 271 -187Q323 -122 414 -122Q464 -122 510 -139Q556 -155 603 -191Z"],"\u0422":[614,"M4 -729H609V-587H392V0H222V-587H4Z"],"\u0423":[694,"M409 -121Q392 -80 366 -53Q313 0 164 0H133V-142H179Q241 -142 255 -176Q259 -183 262 -190L26 -729H203L348 -397L490 -729H667Z"],"\u0424":[892,"M220 -372Q220 -298 254 -266Q288 -233 362 -226V-518Q288 -511 254 -478Q220 -445 220 -372ZM673 -372Q673 -445 639 -478Q604 -511 531 -518V-226Q604 -233 639 -266Q673 -298 673 -372ZM362 -729H531V-657Q692 -642 770 -575Q847 -508 847 -372Q847 -235 770 -168Q692 -102 531 -87V0H362V-87Q200 -102 123 -168Q45 -235 45 -372Q45 -508 123 -575Q200 -642 362 -657Z"],"\u0425":[694,"M448 -372 676 0H500L346 -249L194 0H17L245 -372L26 -729H203L346 -494L490 -729H667Z"],"\u0426":[835,"M653 0H83V-729H252V-142H501V-729H670V-142H781V157H653Z"],"\u0427":[727,"M476 0V-278H246Q163 -278 117 -335Q72 -393 72 -505V-729H242V-595Q242 -479 258 -450Q274 -420 315 -420H476V-729H645V0Z"],"\u0428":[1112,"M640 -142H859V-729H1029V0H83V-729H252V-142H471V-729H640Z"],"\u0429":[1193,"M1029 -142H1139V157H1011V0H83V-729H252V-142H471V-729H640V-142H859V-729H1029Z"],"\u042a":[845,"M529 -128Q582 -128 607 -151Q631 -174 631 -219Q631 -264 607 -286Q583 -309 529 -309H430V-128ZM261 -587H44V-729H430V-451H542Q666 -451 733 -397Q801 -342 801 -225Q801 -109 733 -54Q666 0 542 0H261Z"],"\u042b":[932,"M351 -128Q404 -128 428 -150Q454 -174 454 -219Q454 -264 428 -287Q405 -309 351 -309H252V-128ZM623 -225Q623 -109 559 -57Q488 0 363 0H83V-729H252V-451H363Q488 -451 559 -394Q623 -342 623 -225ZM681 -729H850V0H681Z"],"\u042c":[686,"M351 -128Q404 -128 428 -150Q454 -174 454 -219Q454 -264 428 -287Q405 -309 351 -309H252V-128ZM623 -225Q623 -109 559 -57Q488 0 363 0H83V-729H252V-451H363Q488 -451 559 -394Q623 -342 623 -225Z"],"\u042d":[660,"M58 -191Q148 -122 243 -122Q338 -122 382 -178Q427 -234 434 -293H139V-435H434Q427 -494 382 -550Q338 -606 243 -606Q148 -606 58 -537V-688Q151 -742 260 -742Q424 -742 520 -640Q616 -539 616 -364Q616 -189 520 -88Q424 14 260 14Q151 14 58 -40Z"],"\u042e":[1056,"M336 -435Q348 -558 430 -650Q512 -742 669 -742Q828 -742 917 -642Q1007 -541 1007 -364Q1007 -187 917 -86Q828 14 669 14Q512 14 430 -78Q348 -170 336 -293H252V0H83V-729H252V-435ZM669 -606Q592 -606 549 -542Q507 -479 507 -364Q507 -249 549 -186Q592 -122 669 -122Q747 -122 790 -186Q833 -249 833 -364Q833 -479 790 -542Q747 -606 669 -606Z"],"\u042f":[693,"M257 -500Q257 -450 281 -428Q304 -406 357 -406H441V-593H357Q304 -593 281 -571Q257 -550 257 -500ZM58 0 221 -310Q188 -331 138 -383Q88 -436 88 -508Q88 -618 149 -673Q209 -729 339 -729H610V0H441V-276H384L238 0Z"],"\u0401":[615,"M163 -927H266V-807H163ZM336 -927H440V-807H336ZM83 -729H539V-587H252V-451H522V-309H252V-142H549V0H83Z"],"A":[696,"M481 -133H216L174 0H4L248 -729H449L692 0H522ZM258 -268H438L349 -558Z"],"B":[686,"M345 -447Q385 -447 406 -466Q427 -486 427 -524Q427 -562 406 -581Q385 -601 345 -601H252V-447ZM351 -128Q402 -128 428 -152Q454 -176 454 -224Q454 -271 428 -295Q402 -319 351 -319H252V-128ZM508 -390Q563 -373 593 -325Q623 -278 623 -209Q623 -104 558 -52Q494 0 363 0H83V-729H336Q473 -729 534 -683Q596 -637 596 -536Q596 -483 573 -446Q551 -408 508 -390Z"],"C":[660,"M603 -40Q556 -13 506 0Q455 14 400 14Q236 14 141 -88Q45 -189 45 -364Q45 -539 141 -640Q236 -742 400 -742Q455 -742 506 -729Q556 -715 603 -688V-537Q556 -573 510 -589Q464 -606 414 -606Q323 -606 271 -542Q220 -477 220 -364Q220 -251 271 -187Q323 -122 414 -122Q464 -122 510 -139Q556 -155 603 -191Z"],"D":[747,"M252 -587V-142H312Q416 -142 471 -199Q525 -256 525 -365Q525 -474 471 -530Q417 -587 312 -587ZM83 -729H261Q411 -729 484 -705Q557 -682 609 -625Q655 -576 678 -511Q700 -447 700 -365Q700 -283 678 -218Q655 -153 609 -104Q556 -47 482 -24Q409 0 261 0H83Z"],"E":[615,"M83 -729H539V-587H252V-451H522V-309H252V-142H549V0H83Z"],"F":[615,"M83 -729H539V-587H252V-451H522V-309H252V0H83Z"],"G":[738,"M672 -54Q609 -20 541 -3Q473 14 400 14Q236 14 141 -88Q45 -189 45 -364Q45 -540 142 -641Q240 -742 410 -742Q475 -742 535 -729Q595 -715 648 -688V-537Q593 -572 539 -589Q485 -606 430 -606Q329 -606 274 -543Q220 -480 220 -364Q220 -248 272 -185Q325 -122 422 -122Q449 -122 471 -126Q494 -129 512 -137V-279H409V-405H672Z"],"H":[753,"M83 -729H252V-451H501V-729H670V0H501V-309H252V0H83Z"],"I":[334,"M83 -729H252V0H83Z"],"J":[334,"M83 -729H252V-71Q252 65 186 133Q119 200 -16 200H-50V58H-24Q29 58 56 25Q83 -7 83 -71Z"],"K":[697,"M83 -729H252V-463L496 -729H692L376 -384L725 0H513L252 -287V0H83Z"],"L":[573,"M83 -729H252V-142H549V0H83Z"],"M":[896,"M83 -729H298L447 -339L598 -729H812V0H652V-533L501 -140H394L243 -533V0H83Z"],"N":[753,"M83 -729H271L510 -229V-729H670V0H481L243 -500V0H83Z"],"O":[765,"M382 -606Q305 -606 262 -542Q220 -479 220 -364Q220 -249 262 -186Q305 -122 382 -122Q460 -122 503 -186Q545 -249 545 -364Q545 -479 503 -542Q460 -606 382 -606ZM382 -742Q541 -742 630 -642Q720 -541 720 -364Q720 -187 630 -86Q541 14 382 14Q225 14 135 -86Q45 -187 45 -364Q45 -541 135 -642Q225 -742 382 -742Z"],"P":[659,"M83 -729H363Q489 -729 556 -667Q623 -605 623 -491Q623 -376 556 -315Q489 -253 363 -253H252V0H83ZM252 -593V-389H345Q395 -389 421 -416Q448 -442 448 -491Q448 -540 421 -566Q395 -593 345 -593Z"],"Q":[765,"M400 13H387Q225 13 135 -86Q45 -186 45 -364Q45 -541 135 -642Q225 -742 382 -742Q542 -742 631 -643Q720 -543 720 -364Q720 -241 673 -152Q625 -63 537 -18L669 146H508ZM382 -606Q305 -606 262 -542Q220 -479 220 -364Q220 -247 261 -184Q303 -122 382 -122Q460 -122 503 -186Q545 -249 545 -364Q545 -479 503 -542Q460 -606 382 -606Z"],"R":[693,"M323 -406Q376 -406 399 -428Q422 -450 422 -500Q422 -550 399 -571Q376 -593 323 -593H252V-406ZM252 -276V0H83V-729H341Q471 -729 531 -681Q591 -632 591 -528Q591 -456 560 -409Q529 -363 465 -341Q500 -332 528 -301Q555 -270 583 -207L675 0H495L415 -181Q391 -236 366 -256Q341 -276 300 -276Z"],"S":[648,"M539 -706V-552Q485 -579 434 -592Q382 -606 336 -606Q276 -606 247 -587Q218 -569 218 -530Q218 -500 237 -484Q257 -468 309 -456L380 -440Q490 -416 536 -366Q582 -316 582 -224Q582 -104 518 -45Q454 14 321 14Q259 14 196 1Q133 -12 70 -38V-197Q133 -160 192 -141Q250 -122 305 -122Q360 -122 390 -143Q419 -163 419 -201Q419 -235 399 -254Q379 -272 319 -287L254 -303Q156 -327 110 -378Q64 -429 64 -516Q64 -625 128 -684Q191 -742 310 -742Q364 -742 421 -733Q478 -724 539 -706Z"],"T":[614,"M4 -729H609V-587H392V0H222V-587H4Z"],"U":[730,"M83 -729H252V-292Q252 -202 279 -163Q305 -124 365 -124Q426 -124 452 -163Q479 -202 479 -292V-729H648V-292Q648 -137 578 -62Q508 14 365 14Q222 14 152 -62Q83 -137 83 -292Z"],"V":[696,"M4 -729H174L349 -191L522 -729H692L449 0H248Z"],"W":[993,"M27 -729H189L302 -199L415 -729H578L690 -199L804 -729H965L810 0H615L496 -554L378 0H183Z"],"X":[694,"M448 -372 676 0H500L346 -249L194 0H17L245 -372L26 -729H203L346 -494L490 -729H667Z"],"Y":[651,"M-9 -729H176L326 -469L475 -729H661L411 -307V0H241V-307Z"],"Z":[652,"M51 -729H602V-615L250 -142H612V0H41V-114L393 -587H51Z"],"0":[626,"M414 -365Q414 -502 391 -558Q368 -614 313 -614Q259 -614 236 -558Q212 -502 212 -365Q212 -227 236 -170Q259 -114 313 -114Q367 -114 391 -170Q414 -227 414 -365ZM583 -364Q583 -183 513 -84Q442 14 313 14Q184 14 113 -84Q43 -183 43 -364Q43 -545 113 -644Q184 -742 313 -742Q442 -742 513 -644Q583 -545 583 -364Z"],"1":[626,"M105 -130H255V-601L102 -566V-694L254 -729H415V-130H564V0H105Z"],"2":[626,"M259 -138H548V0H71V-138L311 -373Q343 -405 358 -436Q374 -467 374 -500Q374 -551 343 -583Q312 -614 260 -614Q221 -614 174 -595Q126 -576 73 -539V-699Q130 -720 186 -731Q242 -742 295 -742Q413 -742 478 -685Q543 -627 543 -524Q543 -464 516 -413Q488 -361 399 -275Z"],"3":[626,"M419 -393Q485 -374 520 -327Q555 -280 555 -207Q555 -99 480 -42Q405 14 262 14Q211 14 161 5Q110 -4 60 -22V-167Q107 -141 154 -127Q201 -114 247 -114Q314 -114 350 -140Q385 -166 385 -214Q385 -264 349 -289Q312 -315 240 -315H173V-436H244Q308 -436 339 -458Q370 -480 370 -526Q370 -568 340 -591Q310 -614 254 -614Q213 -614 171 -604Q130 -593 88 -573V-711Q139 -727 188 -734Q237 -742 284 -742Q412 -742 476 -696Q539 -649 539 -555Q539 -491 509 -450Q479 -410 419 -393Z"],"4":[626,"M332 -574 146 -269H332ZM303 -729H491V-269H585V-133H491V0H332V-133H41V-294Z"],"5":[626,"M95 -729H516V-591H230V-478Q250 -484 269 -487Q289 -490 310 -490Q430 -490 497 -424Q563 -357 563 -238Q563 -120 491 -53Q418 14 289 14Q233 14 178 2Q124 -10 69 -34V-182Q123 -148 171 -131Q219 -114 262 -114Q323 -114 359 -147Q394 -181 394 -238Q394 -295 359 -329Q323 -362 262 -362Q226 -362 184 -351Q143 -341 95 -319Z"],"6":[626,"M326 -360Q281 -360 259 -328Q237 -296 237 -232Q237 -168 259 -136Q281 -104 326 -104Q371 -104 393 -136Q415 -168 415 -232Q415 -296 393 -328Q371 -360 326 -360ZM535 -710V-575Q493 -597 456 -608Q419 -618 384 -618Q309 -618 266 -572Q224 -525 217 -433Q246 -457 280 -469Q314 -481 354 -481Q455 -481 516 -416Q578 -350 578 -244Q578 -127 509 -56Q440 14 324 14Q196 14 126 -82Q56 -178 56 -354Q56 -535 138 -638Q220 -741 362 -741Q408 -741 450 -733Q493 -726 535 -710Z"],"7":[626,"M60 -729H555V-623L299 0H134L376 -591H60Z"],"8":[626,"M313 -326Q266 -326 240 -297Q215 -269 215 -215Q215 -161 240 -133Q266 -104 313 -104Q360 -104 385 -133Q411 -161 411 -215Q411 -269 385 -298Q360 -326 313 -326ZM190 -388Q130 -408 100 -450Q69 -491 69 -553Q69 -646 131 -694Q193 -742 313 -742Q433 -742 494 -694Q556 -646 556 -553Q556 -491 526 -450Q495 -408 436 -388Q502 -368 536 -322Q570 -275 570 -205Q570 -97 506 -41Q441 14 313 14Q186 14 120 -41Q55 -97 55 -205Q55 -275 89 -322Q123 -368 190 -388ZM229 -534Q229 -491 251 -467Q273 -444 313 -444Q353 -444 375 -467Q396 -491 396 -534Q396 -578 375 -601Q353 -624 313 -624Q273 -624 251 -601Q229 -577 229 -534Z"],"9":[626,"M90 -16V-151Q130 -130 167 -119Q204 -109 240 -109Q316 -109 358 -156Q400 -202 408 -294Q378 -270 344 -257Q310 -245 271 -245Q170 -245 108 -310Q46 -375 46 -482Q46 -600 115 -670Q184 -741 300 -741Q428 -741 499 -645Q569 -549 569 -373Q569 -192 487 -89Q404 14 261 14Q215 14 173 7Q130 -1 90 -16ZM299 -367Q343 -367 366 -399Q388 -431 388 -495Q388 -559 366 -591Q343 -623 299 -623Q254 -623 232 -591Q209 -559 209 -495Q209 -431 232 -399Q254 -367 299 -367Z"],"-":[374,"M49 -359H325V-217H49Z"],"+":[754,"M429 -627V-371H659V-256H429V0H325V-256H95V-371H325V-627Z"],".":[342,"M92 -189H250V0H92Z"],",":[342,"M92 -189H250V-40L142 142H48L92 -40Z"],":":[360,"M101 -547H259V-358H101ZM101 -189H259V0H101Z"],"/":[329,"M231 -729H329L97 93H0Z"],"\u00b7":[342,"M92 -442H250V-253H92Z"]};

// zamienia tekst na HTML z wektorowymi literami (znaki bez konturu zostaja zwyklym tekstem)
function apRu(text) {
    let out = "";
    for (const ch of String(text)) {
        const g = AP_GLYPHS[ch];
        if (g) {
            out += '<svg class="sv-g" viewBox="0 -800 ' + g[0] + ' 1000" style="width:' + (g[0] / 1000).toFixed(3) +
                'em"><path d="' + g[1] + '"/></svg>';
        } else if (ch === "<") out += "&lt;";
        else if (ch === "&") out += "&amp;";
        else out += ch;
    }
    return out;
}

const AP_SKIN_CSS = `
.ap28-scale{position:relative;margin:0 auto;overflow:hidden}
.sv-root{position:relative;box-sizing:border-box;width:${AP_SKIN_WIDTH}px;margin:0;color:#d9d5c2;word-spacing:.3em;-webkit-user-select:none;user-select:none}
.sv-root *{box-sizing:border-box}
.sv-g{display:inline-block;height:1em;vertical-align:-.2em;fill:currentColor;overflow:visible}
.sv-body{position:relative;padding:15px;border-radius:5px;border:1px solid #072f2d;
 background:url(${AP_TEX.wearBody}) 0 0/100% 100% no-repeat,url(${AP_TEX.paint}) 0 0/256px 256px repeat,
 radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 52%,rgba(0,0,0,.30) 100%),
 linear-gradient(155deg,#33a39b 0%,#26908a 48%,#1c7873 100%);
 box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 -2px 2px rgba(0,0,0,.35),0 7px 14px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.35)}
.sv-body::after{content:"";position:absolute;left:0;top:0;right:0;bottom:0;border-radius:5px;pointer-events:none;
 background:linear-gradient(135deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,0) 38%,rgba(0,0,0,.14) 100%)}
.sv-plate{position:relative;padding:13px 15px 15px;border-radius:4px;border:1px solid #000;
 background:url(${AP_TEX.wearPlate}) 0 0/100% 100% no-repeat,url(${AP_TEX.plate}) 0 0/128px 128px repeat,
 linear-gradient(160deg,#1c1e1f 0%,#121415 45%,#0b0c0d 100%);
 box-shadow:0 0 0 1px rgba(255,255,255,.07),0 3px 6px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.10),inset 0 0 14px rgba(0,0,0,.7)}
.sv-screw{position:absolute;width:13px;height:13px;border-radius:50%;border:1px solid #121210;
 background:radial-gradient(circle at 35% 30%,#d6d7d2 0,#9a9b96 40%,#55564f 85%,#3a3b36 100%);
 box-shadow:0 1px 1px rgba(0,0,0,.8),inset 0 0 2px rgba(0,0,0,.45)}
.sv-screw::before,.sv-screw::after{content:"";position:absolute;left:50%;top:50%;background:#222320;border-radius:1px}
.sv-screw::before{width:8px;height:2px;margin:-1px 0 0 -4px}
.sv-screw::after{width:2px;height:8px;margin:-4px 0 0 -1px}
.sv-tl{left:5px;top:5px;transform:rotate(15deg)}.sv-tr{right:5px;top:5px;transform:rotate(48deg)}
.sv-bl{left:5px;bottom:5px;transform:rotate(70deg)}.sv-br{right:5px;bottom:5px;transform:rotate(28deg)}
.sv-title{display:flex;justify-content:space-between;align-items:center;margin:0 16px 11px 18px;font-size:15px;color:#e1ddc9}
.sv-title .sv-g{margin-right:3.5px}
.sv-title small{font-size:10px;opacity:.7}
.sv-title small .sv-g{margin-right:2px}
.sv-keys{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;padding:9px 9px 7px;margin-bottom:14px;
 border:1px solid rgba(214,210,190,.5);border-radius:2px}
.sv-keycell{text-align:center}
.sv-key{height:56px;padding:3px;border-radius:4px;border:1px solid #000;cursor:pointer;
 background:linear-gradient(#030303,#171818);box-shadow:0 1px 0 rgba(255,255,255,.14),inset 0 1px 4px #000}
.sv-lens{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;border-radius:2px;
 color:#16120a;font-size:13px;line-height:1.2;
 background:linear-gradient(180deg,rgba(255,255,255,.20) 0%,rgba(255,255,255,0) 42%),
 radial-gradient(ellipse at 50% 55%,#c7a24b 0%,#b08b36 62%,#8a6a22 100%);
 box-shadow:inset 0 0 0 1px rgba(0,0,0,.4),inset 0 -4px 6px rgba(0,0,0,.30),inset 0 2px 2px rgba(255,255,255,.15)}
.sv-lens .sv-g{margin-right:.5px}
.sv-lens small{font-size:9px;opacity:.85}
.sv-lens{white-space:nowrap}
.sv-lens.sv-long{font-size:11px}
.sv-key:active{transform:translateY(1px)}
.sv-key:active .sv-lens{filter:brightness(.9)}
.sv-key[activated="true"]{box-shadow:0 1px 0 rgba(255,255,255,.14),inset 0 1px 4px #000,0 0 10px 1px rgba(255,190,70,.30)}
.sv-key[activated="true"] .sv-lens{
 background:linear-gradient(180deg,rgba(255,255,255,.28) 0%,rgba(255,255,255,0) 40%),
 radial-gradient(ellipse at 50% 50%,#fff3b8 0%,#ffd45c 50%,#eaa524 100%);
 box-shadow:inset 0 0 0 1px rgba(90,50,0,.45),inset 0 -3px 5px rgba(150,80,0,.30)}
.sv-key.sv-green .sv-lens{
 background:linear-gradient(180deg,rgba(255,255,255,.18) 0%,rgba(255,255,255,0) 42%),
 radial-gradient(ellipse at 50% 55%,#5f9a6e 0%,#427957 62%,#2c5539 100%)}
.sv-key.sv-green[activated="true"]{box-shadow:0 1px 0 rgba(255,255,255,.14),inset 0 1px 4px #000,0 0 10px 1px rgba(90,235,150,.30)}
.sv-key.sv-green[activated="true"] .sv-lens{
 background:linear-gradient(180deg,rgba(255,255,255,.30) 0%,rgba(255,255,255,0) 40%),
 radial-gradient(ellipse at 50% 50%,#e4ffe9 0%,#9deebb 48%,#45c37a 100%);
 box-shadow:inset 0 0 0 1px rgba(0,70,30,.45),inset 0 -3px 5px rgba(0,90,40,.30)}
.sv-keys .sv-lens{font-size:12px}
.sv-keys .sv-lens.sv-long{font-size:8.6px}
.sv-keys .sv-lens.sv-mid{font-size:10.5px}
.sv-key.sv-cyan .sv-lens{
 background:linear-gradient(180deg,rgba(255,255,255,.18) 0%,rgba(255,255,255,0) 42%),
 radial-gradient(ellipse at 50% 55%,#3f8f93 0%,#2c7276 62%,#1d5054 100%)}
.sv-key.sv-cyan[activated="true"]{box-shadow:0 1px 0 rgba(255,255,255,.14),inset 0 1px 4px #000,0 0 10px 1px rgba(80,230,240,.35)}
.sv-key.sv-cyan[activated="true"] .sv-lens{
 background:linear-gradient(180deg,rgba(255,255,255,.30) 0%,rgba(255,255,255,0) 40%),
 radial-gradient(ellipse at 50% 50%,#e6ffff 0%,#8ff0f4 48%,#35bfc6 100%);
 box-shadow:inset 0 0 0 1px rgba(0,70,80,.45),inset 0 -3px 5px rgba(0,90,100,.30)}
.sv-btn.sv-litc{color:#7ff3f7;text-shadow:0 0 6px rgba(80,230,240,.7)}
.sv-key.sv-red .sv-lens{
 background:linear-gradient(180deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,0) 42%),
 radial-gradient(ellipse at 50% 55%,#b8582b 0%,#8f4220 62%,#6a2f15 100%)}
.sv-key.sv-red[activated="true"]{box-shadow:0 1px 0 rgba(255,255,255,.14),inset 0 1px 4px #000,0 0 10px 1px rgba(255,120,50,.35)}
.sv-key.sv-red[activated="true"] .sv-lens{
 background:linear-gradient(180deg,rgba(255,255,255,.28) 0%,rgba(255,255,255,0) 40%),
 radial-gradient(ellipse at 50% 50%,#ffd9bd 0%,#ff9858 50%,#e2571d 100%);
 box-shadow:inset 0 0 0 1px rgba(100,30,0,.45),inset 0 -3px 5px rgba(150,50,0,.30)}
.sv-cap{margin-top:5px;font-size:10px;opacity:.8}
.sv-cap .sv-g{margin-right:2.2px}
.sv-row{display:flex;justify-content:space-between;gap:8px;align-items:stretch;margin-bottom:14px}
.sv-group{position:relative;padding:18px 8px 10px;display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;
 border:1px solid rgba(214,210,190,.5);border-radius:2px}
.sv-glabel{position:absolute;top:-7px;left:8px;padding:0 5px;background:#111314;font-size:10px;white-space:nowrap}
.sv-glabel .sv-g{margin-right:1.3px}
.sv-dial{flex:0 0 88px;padding:9px 5px}
.sv-dsvg{width:72px;height:72px;display:block}
.sv-rocks{display:flex;flex-direction:column;gap:2px}
.sv-rock{width:24px;height:16px;border-radius:2px;border:1px solid #000;display:flex;align-items:center;justify-content:center;cursor:pointer;
 background:linear-gradient(#2c2e30,#151617);
 box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 -2px 2px rgba(0,0,0,.55),0 1px 1px rgba(0,0,0,.7)}
.sv-rock svg{width:9px;height:9px;fill:#d9d5c2;opacity:.92}
.sv-rock:active{transform:translateY(1px);filter:brightness(.8)}
.sv-ctr{position:relative;display:flex;margin:4px;padding:3px;border-radius:3px;background:#000;
 box-shadow:0 0 0 1px #000,0 0 0 3px #3a3c3e,0 0 0 4px #0c0d0d,0 1px 0 4px rgba(255,255,255,.08),inset 0 0 7px #000}
.sv-ctr::after{content:"";position:absolute;left:0;top:0;right:0;bottom:0;border-radius:3px;pointer-events:none;
 background:linear-gradient(118deg,rgba(255,255,255,.17) 0%,rgba(255,255,255,.05) 38%,rgba(255,255,255,0) 39%)}
.sv-cell{width:16px;height:34px;margin:0 .5px;text-align:center;color:#ece7d2;font-size:24px;line-height:34px;overflow:hidden;
 background:linear-gradient(180deg,#000 0%,#1a1a1a 14%,#2b2b2b 50%,#171717 86%,#000 100%);
 border-left:1px solid #050505;border-right:1px solid #353535}
.sv-cell .sv-g{vertical-align:-.17em}
.sv-cell.sv-sign{width:16px}
.sv-ctr.sv-dim .sv-cell{color:#8d8a7b}
.sv-bottom{display:flex;gap:10px;align-items:stretch}
.sv-status{position:relative;flex:1;min-height:48px;margin:4px;padding:7px 10px;border-radius:3px;overflow:hidden;
 background:radial-gradient(ellipse at 30% 50%,#1c1000 0%,#060402 72%);color:#ffae20;font-size:14px;line-height:1.4;white-space:pre;
 box-shadow:0 0 0 1px #000,0 0 0 3px #3a3c3e,0 0 0 4px #0c0d0d,inset 0 0 10px #000}
.sv-status .sv-g{margin-right:1px}
.sv-status::after{content:"";position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;
 background:repeating-linear-gradient(0deg,rgba(0,0,0,.26) 0,rgba(0,0,0,.26) 1px,rgba(0,0,0,0) 1px,rgba(0,0,0,0) 3px),
 linear-gradient(118deg,rgba(255,255,255,.10) 0,rgba(255,255,255,0) 40%)}
.sv-mini{flex:0 0 176px;margin:4px 0;border:1px solid #000;border-radius:3px;display:flex;align-items:center;justify-content:center;
 background:linear-gradient(#2c2e30,#151617);color:#d9d5c2;font-size:11px;cursor:pointer;
 box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 -2px 3px rgba(0,0,0,.55),0 1px 2px rgba(0,0,0,.7)}
.sv-mini .sv-g{margin-right:1.4px}
.sv-mini:active{transform:translateY(1px);filter:brightness(.85)}
.sv-skinbtn{flex:0 0 64px}
.sv-navrow{margin-bottom:14px}
.sv-nav{flex:1;justify-content:space-between;gap:10px;padding:19px 14px 9px}
.sv-navcol{display:flex;flex-direction:column;align-items:center}
.sv-ncap{margin-top:6px;font-size:9px;opacity:.8}
.sv-ncap .sv-g{margin-right:1.4px}
.sv-btn{width:74px;height:34px;border:1px solid #000;border-radius:3px;display:flex;align-items:center;justify-content:center;
 background:linear-gradient(#2c2e30,#151617);color:#d9d5c2;font-size:11px;cursor:pointer;
 box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 -2px 3px rgba(0,0,0,.55),0 1px 2px rgba(0,0,0,.7)}
.sv-btn .sv-g{margin-right:1.4px}
.sv-btn:active{transform:translateY(1px);filter:brightness(.85)}
.sv-cell.sv-dot{width:8px}
.sv-cell.sv-pick{box-shadow:inset 0 -3px 0 #e39a1a}
.sv-altctr{cursor:pointer}
.sv-unitbtn{flex:0 0 72px}
.sv-anns{display:flex;gap:8px}
.sv-ann{min-width:80px;height:22px;padding:0 7px;display:flex;align-items:center;justify-content:center;border-radius:2px;cursor:pointer;
 border:1px solid #000;font-size:9.5px;color:#5a2a18;background:linear-gradient(#3a1a12,#22100b);
 box-shadow:0 0 0 2px #2c2e30,0 0 0 3px #0b0c0d,inset 0 0 5px rgba(0,0,0,.85)}
.sv-ann .sv-g{margin-right:1px}
.sv-ann[activated="true"]{color:#fff3e0;background:radial-gradient(ellipse at 50% 45%,#ff9a6a 0%,#e4471c 58%,#a0260a 100%);
 box-shadow:0 0 0 2px #2c2e30,0 0 0 3px #0b0c0d,0 0 12px 3px rgba(255,90,40,.55)}
.sv-ann.sv-amb{color:#5a4212;background:linear-gradient(#3a2c10,#221a08)}
.sv-ann.sv-amb[activated="true"]{color:#2a1a00;background:radial-gradient(ellipse at 50% 45%,#ffe08a 0%,#f0a81e 58%,#a86a06 100%);
 box-shadow:0 0 0 2px #2c2e30,0 0 0 3px #0b0c0d,0 0 12px 3px rgba(255,190,60,.5)}
.sv-anns .sv-ann{min-width:0;padding:0 5px;font-size:9px}
.sv-anns{gap:6px}
.sv-ann.sv-grn{color:#1f4a2a;background:linear-gradient(#12301c,#0a1c10)}
.sv-ann.sv-grn[activated="true"]{color:#06260f;background:radial-gradient(ellipse at 50% 45%,#b9ffcf 0%,#3fd277 58%,#178a3c 100%);
 box-shadow:0 0 0 2px #2c2e30,0 0 0 3px #0b0c0d,0 0 12px 3px rgba(80,255,140,.45)}
.sv-mini.sv-lit,.sv-btn.sv-lit{color:#ffc95a;text-shadow:0 0 6px rgba(255,170,40,.7);background:linear-gradient(#3a3324,#1d1a12)}
.sv-radio{flex:1;justify-content:space-between;gap:8px;padding:19px 10px 9px}
.sv-srcbtn{width:66px}
.sv-srcsel{position:relative;flex:none;width:66px;height:70px;cursor:pointer}
.sv-srcsel .sv-tf{top:0}
.sv-tf[data-pos="mid"] .p-mid{display:inline}
.sv-sl{position:absolute;left:25px;font-size:9.5px;color:#8f8c7e;white-space:nowrap}
.sv-sl.sv-on{color:#ffcf5a;text-shadow:0 0 5px rgba(255,180,40,.6)}
.sv-sl1{top:2px}.sv-sl2{top:22px}.sv-sl3{top:42px}
.sv-slcap{position:absolute;left:0;right:0;bottom:0;text-align:left;font-size:8.5px;color:#a9a593;white-space:nowrap}
.sv-tfcol{position:relative;flex:none;width:40px;height:56px;cursor:pointer}
.sv-tf{position:absolute;left:0;top:0;width:24px;height:56px}
.sv-tf .an-tg{position:absolute;left:0;top:0;width:24px;height:56px;overflow:visible}
.sv-tf .p-up,.sv-tf .p-mid,.sv-tf .p-down{display:none}
.sv-tf[data-pos="up"] .p-up,.sv-tf[data-pos="down"] .p-down{display:inline}
.sv-tfl{position:absolute;left:25px;font-size:10px;color:#9b988b}
.sv-tfa{top:2px}.sv-tfb{bottom:2px}
.sv-tfl.sv-on{color:#e9e5d4}
.sv-debug{display:none;width:100%;height:90px;margin-top:8px;background:#000;color:#9f9;border:1px solid #333;font:11px/1.2 monospace;resize:none}
`;

function apVemBox(size) {
    return '<div class="vem-box" style="width:' + size + 'px;height:' + size + 'px"><div class="vem" style="transform:scale(' +
        (size / AP_VEM_SIZE).toFixed(4) + ')"></div></div>';
}

function apSkinHTML(vem) {
    const L = AP_LABELS;
    let ticks = "";
    for (let a = 0; a < 360; a += 10) {
        const major = (a % 30 === 0);
        const r1 = major ? 35 : 39.5, r2 = 43, rad = a * Math.PI / 180;
        ticks += '<line x1="' + (50 + r1 * Math.sin(rad)).toFixed(1) + '" y1="' + (50 - r1 * Math.cos(rad)).toFixed(1) +
            '" x2="' + (50 + r2 * Math.sin(rad)).toFixed(1) + '" y2="' + (50 - r2 * Math.cos(rad)).toFixed(1) +
            '" stroke="#d8d4bf" stroke-width="' + (major ? 2 : 1) + '"/>';
    }
    const dial = '<svg class="sv-dsvg" viewBox="0 0 100 100"><defs>' +
        '<linearGradient id="svBz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4d6d3"/><stop offset=".45" stop-color="#7c7f7e"/><stop offset="1" stop-color="#26282a"/></linearGradient>' +
        '<radialGradient id="svFace" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1b1c1d"/><stop offset="1" stop-color="#040404"/></radialGradient>' +
        '<linearGradient id="svGl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
        '<circle cx="50" cy="50" r="49" fill="url(#svBz)"/><circle cx="50" cy="50" r="45.5" fill="#050505"/><circle cx="50" cy="50" r="44.5" fill="url(#svFace)"/>' + ticks +
        '<path d="M50 30 L54 46 L66 54 L66 58 L53 54 L53 66 L58 70 L58 73 L50 71 L42 73 L42 70 L47 66 L47 54 L34 58 L34 54 L46 46Z" fill="#d8d4bf"/>' +
        '<g data-k="needle"><path d="M50 4 L43.5 19 L56.5 19Z" fill="#e39a1a" stroke="#4a2d00" stroke-width=".6"/>' +
        '<line x1="50" y1="19" x2="50" y2="30" stroke="#e39a1a" stroke-width="2.5"/></g>' +
        '<ellipse cx="38" cy="29" rx="30" ry="16" transform="rotate(-28 50 50)" fill="url(#svGl)"/>' +
        '<circle cx="50" cy="50" r="44.5" fill="none" stroke="#000" stroke-opacity=".65" stroke-width="1.6"/></svg>';
    const triV = (up) => '<svg viewBox="0 0 10 10"><path d="' + (up ? "M1 8 L5 2 L9 8Z" : "M1 2 L5 8 L9 2Z") + '"/></svg>';
    const rocks = (inc, dec) => '<div class="sv-rocks"><div class="sv-rock" data-k="' + inc + '">' + triV(true) +
        '</div><div class="sv-rock" data-k="' + dec + '">' + triV(false) + '</div></div>';
    const key = (cls, k, main, sub, cap) => '<div class="sv-keycell"><div class="sv-key ' + cls + '" data-k="' + k + '"><span class="sv-lens' + (String(main).length > 7 ? ' sv-long' : (String(main).length > 5 ? ' sv-mid' : '')) + '"><span>' +
        apRu(main) + '</span>' + (sub ? '<small>' + apRu(sub) + '</small>' : '') + '</span></div><div class="sv-cap">' + apRu(cap) + '</div></div>';
    const group = (cls, label, ctrKey, incKey, decKey) => '<div class="sv-group ' + cls + '"><span class="sv-glabel" data-k="' + ctrKey + 'Cap">' + apRu(label) +
        '</span><div class="sv-ctr" data-k="' + ctrKey + '"></div>' + rocks(incKey, decKey) + '</div>';
    return '<div class="sv-root"><style>' + AP_SKIN_CSS + AP_VEM_CSS + '</style><div class="sv-body"><div class="sv-plate">' +
        '<i class="sv-screw sv-tl"></i><i class="sv-screw sv-tr"></i><i class="sv-screw sv-bl"></i><i class="sv-screw sv-br"></i>' +
        '<div class="sv-title"><span>' + apRu(L.title) + '</span>' + apAnnHTML() + '</div>' +
        '<div class="sv-keys">' +
        key("sv-green", "ap", L.ap, L.apSub, "AP") + key("sv-red", "lvl", L.lvl, "", "LVL") +
        key("", "hdg", L.hdg, "", "HDG") + key("", "nav", L.nvu, "", "NAV") + key("", "alt", L.alt, "", "ALT") + key("", "vs", L.vs, "", "VS") +
        key("sv-cyan", "at", L.at, "", "A/T") +
        '</div>' +
        '<div class="sv-row"><div class="sv-group sv-dial">' + dial + '</div>' +
        group("", L.hdgGroup, "hdgCounter", "hdginc", "hdgdec") +
        group("", L.altGroup, "altCounter", "altinc", "altdec") +
        group("", L.vsGroup, "vsCounter", "vsinc", "vsdec") + '</div>' +
        '<div class="sv-row sv-navrow"><div class="sv-group sv-nav"><span class="sv-glabel">' + apRu(L.navGroup) + '</span>' +
        '<div class="sv-navcol"><div class="sv-ctr" data-k="wpCounter"></div><div class="sv-ncap">' + apRu(L.wp) + '</div></div>' + rocks("wpinc", "wpdec") +
        '<div class="sv-navcol"><div class="sv-ctr" data-k="distCounter"></div><div class="sv-ncap">' + apRu(L.dist) + '</div></div>' +
        '<div class="sv-navcol"><div class="sv-ctr" data-k="crsCounter"></div><div class="sv-ncap">' + apRu(L.crs) + '</div></div>' +
        '<div class="sv-navcol"><div class="sv-ctr" data-k="xtkCounter"></div><div class="sv-ncap">' + apRu(L.xtk) + '</div></div>' +
        '<div class="sv-btn" data-k="loadroute">' + apRu(L.load) + '</div></div></div>' + apRadioRowHTML(rocks) +
        (vem ? '<div class="sv-bottom sv-vembot">' + apVemBox(196) + '<div class="sv-vcol"><div class="sv-status" data-k="status"></div><div class="sv-vbtns">' +
            '<div class="sv-mini" data-k="controls"></div><div class="sv-mini" data-k="ydbtn">' + apRu(AP_LABELS.yd) + '</div></div><div class="sv-vbtns"><div class="sv-mini sv-unitbtn" data-k="unitbtn"></div><div class="sv-mini sv-skinbtn" data-k="vembtn">' + apRu(AP_LABELS.vem) +
            '</div><div class="sv-mini sv-skinbtn" data-k="skinbtn">' + apRu("\u0412\u0418\u0414") + '</div></div></div></div>'
        : '<div class="sv-bottom"><div class="sv-status" data-k="status"></div><div class="sv-mini" data-k="controls" style="flex-basis:132px"></div><div class="sv-mini" data-k="ydbtn" style="flex-basis:64px">' + apRu(AP_LABELS.yd) + '</div><div class="sv-mini sv-unitbtn" data-k="unitbtn"></div><div class="sv-mini sv-skinbtn" data-k="vembtn">' + apRu(AP_LABELS.vem) + '</div><div class="sv-mini sv-skinbtn" data-k="skinbtn">' + apRu("\u0412\u0418\u0414") + '</div></div>') +
        '<textarea class="sv-debug" data-k="debug" readonly></textarea>' +
        '</div></div></div>';
}

// tekstury pulpitu AP-28L1: czarna farba strukturalna (szagren) i przetarcia krawedzi kazdego bloku
const AP_TEX_AN = {"knob":"data:image/png;base64,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","knobSpec":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAWgAAAFoCAYAAAB65WHVAAALIUlEQVR42u3d628U1x3H4a+NDQYM5k4ubUJIqlZ90UqV8qL//7/Re9MUKRBxhxjvTF+csbqsbHZmZy9n4XkkywSIIh0ln/w4e+bMTtu2AaA+u5YAQKABEGgAgQZAoAEEGgCBBkCgAQQaAIEGEGgABBoAgQYQaAAEGkCgARBoAIEGQKABEGgAgQZAoAEEGgCBBkCgAQQaAIEGEGgABBpAoAEQaAAEGkCgARBoAIEGQKABEGgAgQZAoAEEGgCBBhBoAAQaAIEGEGgABBpAoAEQaAAEGkCgARBoAIEGQKABEGgAgQZAoAEEGgCBBhBoAAQaAIEGEGgABBpAoAEQaAAEGkCgARBoAIEGQKABBBoAgQZAoAEEGgCBBhBoAAQagFl7loAttp/kSvf9QvdzbZJJkpMkx0l+SdJYKgQaludOki+TXOqi23Rf0z9u5vxa08X69PtkKt6nX+KNQMMHfJ3ki6kJePprMvPXpyEeaqf72p2atnenoi3UCDQk+TbJ/akgT4d5NtJnhba1hAg0LO50Yj2dTL9P2SvOGfFtR/wz2p7hbs/4Zwk9As0n40K3bXC65/v9zL9j7RLj346YqkUageaTmZQvdj8+SfKbJDcEEASazbmYsmXRpBxl+/MZMe4T50X+nkWZnBFoPmqXuzCfdJH+/Tkf6A0N4CaDKdYINFvtahfkd0muJXmwhDC3Kw7mvA8GhRmBZuvDfPCBiXmRbYyxJyz6/E+hFWkEmnzEWxmHKXvMb5L8aeYhkWXsHbc9In3WV3r83iGRBoEm23JU7lb3/XWSP049Nr2KSfS8SC8ydfeZoNs54QaBpko3ui2N45RHry+nnGce8nDJMibpds4EfV50+0zQ4oxAk207Mncn5SGT50n+MHP3RQZMtvnAI9p99pH7hLMd8SXOCDRb41aS6ylnmb+aejy76bFHnCUfreszGff9PfP2ocUZgSY17zV/3k3Pz1JOZzQLxrnvVL0z8IPCdoVfQ/5EAALN2lxLci9lf/koZb95MnW1Z98950Um5iFbHcKMQPNJuZfkZsoJjYcp55tPL7EfshWwjFMbfT4sHPPV9Ii0UCPQVOHXKWebn6ZcanSS8mRgk/NPOWQDd2XMm6KbOQE+69dEGYEmte43P0h5fdRxku+m3tnX54/+y4r1TsYftWvO+OuzvoZseYBAsxEHXZx3U/ab97qp+XgmUE3PAI+JWpvh56E/NCE3GbcXDQLNxhx2cZ4k+ayL8tsu0GeFeZFJedH3Ay561K454/t5k/PsryXDz3SDQLN0RykvY32XcpzuOOVOjZOpMDVrCvLQy476bnHMi7IpGoEmNT6y/aCL8unk/GrmpMaQ+y6ypmtB+z7uPWSKFmcEmqri/DDlycD7XZxfTsU55/xxf1VPB4691W5IoPvuT3uSEIFmI9saD7ttjftdpJ/n/QdQmhFPAq7iTSXzHlTJnC2OeaF2zA6BJjV8IPhtF+N7KfvNz3rEeZlvQsnI/eyhj3o3c76bnhFoNu5SyoMnO0nudnF+OrPn3KxoL3nR6bvvbXZ9nxQcEmsQaNZiJ8lvU17ketTF+eeZo3STNXzYN+YVVX3vb+4T6LbHB4Ug0KzF71Iu2b+ecr/Gk7z/EMok63ujdd9z1PM+FMwH9o3nRbiZ87g3CDRr8U3Kfc773eT8OOVBlG2L8yLT85iLkkCgWan7KdeEvu6m58fdj6c/EFz1Aydjtzf6Ts/pcSudB1MQaKpwtZue36RcHfpTylnnpse+c99QrfqJwaHTc+bcTifOCDRVOD2xcTtlz/npTJAnlT0ZODTOGRloZ54RaDbiu25L4/Re58eZf2Jjk2Ees80xdqIGgWZt7qRcfLSbcrfGjylPC7YLxnmVj3GPPfs8NtYg0GSdl+4/TDlCd5jkX12k23MeRFk0zKt+ldWYKbrPz4FAs5GtjYMkV5I8mtp3nn2Me5H4LvuDw7GPdw+NNgg0G3M75Vjd9ZT7NR6l7DuPPe+86mAPeUHskGkaBJpqPOiC/CbJP/P+eefJyH3gdWyJDA21CRkEeit8nbLnfNjF+emI60PbrGayXvaHh4BAZxtuqfsy5cGUF0n+O7O10SwxzGN+DhDofIpbG3vdxPz3lFMbzYAPBYfcJAcIND1dS7l4/3bKkbonef+1VZOs53FtQKCZ8VU3Jb9I8o+8/0BKY3ng47drCVLruwVvpTw5+EP+/+qqRpxBoNmsX3VBftkF+sSSgECTKvaeb3bT89+6SAMCTQW+mJqef7QcINCkmnPPt1JOb/w15YNBQKCpwOcpF/G/Mj0DAp3qLkU6nZ7fWQ4QaOpwN8nFlLdy/2A5AIFOVW9LaVIuRDI9AwJdiYspt9XdTXlqEECgK5qed1JeAPvGcgACXY+bKW9L+YulAAQ6VZ19Pki5uOpnywEIdF3Tc5vk33EREiDQqe3muuvx4SAg0FXZSdne2I8PBwGBrm563ontDUCgU+PVou/iyUFAoKtzOeXVVm8tBSDQda39fpJH8cYUQKCrcrX7/h9LAQh0Xa6k7D8/txSAQNflIMlnbq4DBLo+e0mepLx/EECgK1v7nywDINCpbnujTfLaUgACneou6J/E/jMg0NXZn4o0gECnrg8I3wk0IND1uZDkZco+NIBAp65rRu0/AwJdKfdvAAJdoTb2nwGBrjbQLugHBFqgAYGm75o3Ag0IdL0TtCN2gECnviN2jUADAl3v9CzQgEDb4gAEGnEGBFqgAYFmVZEGEGiBBgQagQYEWqABgWYVmpQHVgAE2gQNCDQmaECgt5jL+gGBrjjQJmhAoAEEGgCBBhBossKTHAACHWehYVH7lkCggTpdsAQCDfjTHlN22tbaA5igAY3A4gNLcdkSCDQQHxASe9DAoCHOmX0TNFCZPXEWaKBOVy2BQAMQe9AAJmhgq123BAINaAOxxQHg/5LAVjuyBAINQGxxAOn9cMqJZTBBA/W5ZglM0IAJGhM0kP5nn8VZoAGILQ6ghytJXlsGEzRQn4uWwAQN1OdSkl8sgwkaiPcOYoIG5jtI8tYymKCBOgONCRqozGGSl5bBBA3Ux3Qm0ECFbiR5ZRliiwMAEzQw301LYIIG4oNBTNBAP8eWQKCBVLm1IdCxxQGkujelvLAMAg1U9t95nHuOLQ4glb4pRZwFGkh9+87PLIMtDiD2nRFoIHPfkOLERmxxAPW5YAkEGqjPUZI3lkGggVR3S50PBQUaqDDOTy2DQAPijEAD4izQgDgj0IA4I9Agzgg0IM4INIgzn4A9SwBbM0wdinNclgRU5UqSk7j8yBYHkNq2NF6Ls0AD9puJLQ7gfAcpnw+9tBTxISFgasYEDZw/LB2Ymok9aKhuaj4RZ0zQkKr2mt9aBgQaILY4AP/N4V8W2DqNJUCgAQQaAIEGEGgABBoAgQYQaAAEGkCgARBoAAQaQKABEGgAgQZAoAEEGgCBBkCgAQQaAIEGEGgABBoAgQYQaAAEGkCgARBoAIEGQKABEGgAgQZAoAEEGgCBBkCgAQQaAIEGEGgABBpAoAEQaAAEGkCgARBoAIEGQKABEGgAgQZAoAEEGgCBBkCgAQQaAIEGEGgABBpAoAEQaAAEGkCgARBoAIEGQKABEGgAgQZAoAEEGgCBBhBoAAQaAIEGEGgABBpAoAEQaAAEGkCgARBoAIEGQKABBBoAgQZAoAEEGgCBBhBoAAQaAIEGEGgABBpAoAEQaAAEGkCgARBoAIEGQKABBBoAgQZAoAEEGgCBBhBoAAQaAIEGEGgABBpAoAEQaACBBkCgARBoAIEGQKABBBoAgQZg2v8ApaTVUgMhZnkAAAAASUVORK5CYII=","crinkle":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAAYFBMVEX///8AAAAAAAD///8AAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACig6KfAAAAIHRSTlMKDSonRkRjAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJk+OE0AADinSURBVHjadZ2Jli05qkMZot7/f/K7GTawRZyu1V11h8yTMdgYhCTMzNzs/bf/+8Xf/+PvD/z86fnH39/5v7/I87t4//d+/b9fvd/w7wPy728tIuz8mdcn/vvn39/9+/P+wL+vqE/y9wr8/qCI92/u1/776/dj7we5z4f8+2Ofq5xf3l/5e733T95Pei/W34+3cyd15c4H8O+fxOf5+a7zrfUH9+bv39b932+Ix8/1n7986sfV1/n80L/vzfu9fj7v7+H5/PRwvVF3/Cj51fwM//6Vnae/rra+ur70/e19/fedu/ct1nfO5f37kf2K5/bPu7e/q+7f3UdlNm+lX1Y/APz0Xg5e93/fJ15LX+S5h3OJsz7+PcmU1VuLF5dbr7HuIWYx1J/cG/S63Xe9982m4aLy3n//zntxz1fVCnbHUzlf6LPsznPpG+Rb6Mtzk+8/2+aZTRbzAAwbbDb6/VisJCyz5BqrP05sq/MB6e/Gerf+2f/3jc6z6Bd1X+VsA787vv/dFxjvxd8nfZ95r6X7Na6xiXuUcYn31ovzrmI+ALsfev7sqY/O841ZcYth0P6+LCpG9dfOT3vk/u9X+Gyr+wBqiVRIOO86ExFnbuj8suNF7c1whlubW7sv/N71eaSzm7E4zpvsB5O9uJ7e6eeb77q6V1lPadav9zt6ApuzA4LxAWSv8XpztYUzzRnKZDPM0nbn/U8Qr4j+3lMFmUDwqtfYr+tc7Wzf++jeC7qnVUUW6585l/e+HkTPf/+799pxDqcithSPqYnQvXSxqu5Bgg3Ya7fDbAUJx0fG2aBciXMczYkcPu/BNO7UR98jvu6foTx4csjS7m36t6uTcb+fff1fl+bEu3mheV/dRBGGwTmNeivH/WFe7/PfNfytrbvO4v5LthDOLDz8+xj/rRTZazzekhlDx69aynX5swTryv/ygDr27iu4Id3lZ4RP3lIbgCesT8iv/Y4s5z7Df5eDZRT3UHqvdiLGnLl/X3zWj9+X9y+uyUaap5H3tGZo7Zd2U8BeODfivLf6ZNZuqp+N+NW/Dp6hFQyDDzBlkTuX+P2sjl+TScTTAaaXj9zC/ZbK8B4u8noAtZ/Dee5iG9q7gO7hhkOw/8g7SUUwPSvzHlznNutZzzlXZ1B9H858kxUU/dP1/s/nRm+uex4hSkQ/jHOuVb7kiBj3Z9xtEjZZhIUkc2nyiDoPlC37rsq7bCr4P5b3NKlkdOqFm27PSnHXGz23v46T++vKTd6rfp9gGs+QcxXvNqnP0IzeJNY7j5276EO2P9a4rJWpL/7eytmeTKm6krpL4xY091U8fYzaRB08AJ6m3BcndJ3aLZGCo2TzCTd1HswL5YFxM+V6hLXCJ5tD9dG/mVThrv/3P3mXXi+k9wX3c58z2OcF+yqc5nDwytIZ5ZGK3U9/j+pJ8aUI7mzF+6TUHLJq6Pc/2GBdNqCGZaYf9z9RQbEzlKi/rHS513XXIvOeK5uMeTOOaqJWYEcpxOr3J/97c8/J/Sql1eKgbvXshqxnGKgbfCKD1+qaRdpZkOZ2lRzPHdVV/31YH+A32mi1MpV8pVN6aE4xe1GKs8MyJ4NAYeeB0IEK11aFNjffD+Bc3LtqY37yWdKd6aW/f9/vZCJJJZtIlDt9z+y8OqS6J9aBoIf02LUC7z3YqVhVUL7i4nxr6BZH2qA1xht+zlXEpLp14P8hI3dJ+Y6gE1QmVPvsU5tz/SYryKRdUsaumnCQ23xnh8rJ1YhL+Ox8G6wA4bAPxjhpAwroAmoqSZsf6n3wN+pVh0Oahui7v8+vknlfAwj1M26sYPp/08YEQoI8hgky69CJSi8AhfreFWg68FSDYP/u/78JjBsuvNXi80y20zHM684HNagveaoOj0adTpTH87yr8pEI3JUzaxevJMHxkjKn9urM8ry03nbh3/t3m4z1Bg4E2a7u+0i7kV8APuzbnNoJhfMTVgdZvVp/OjsSUKXPRaBa3vldFWxVv52f/gaSCn0dMC76gA2iMPDEhvcmE/fSR259v0mGRRi2N2pq3doJpSMidt0SzgTABUHJXEDovAPvrBKgIMDjm8pZndRzTH0BcEAkeaJ8HOTCmXR18RxyIqPgHoCyMNLzEztrQ3rWX3nxBnyK9xk+iJJWlLeadYmy62zwk5N6nV/9su7rTFmq6AHUG6ntduI6oaZVP/fCvEsjGv3pg1PDjCBzeoPhAhmkuf593XmHKd3G8zbiTelreQY+dUB566qex1OlK29dZh3iV8pX9VYfkOfZvcllgdE2KTqLkYjfUbsyHUImSMgrzFSUYCnsK2OYOO6naJeFml1BESYUhL5C0+QJ1jn/3X3vCfHwBacJDoQLB5SG5TuvakoUhGRn1uO4yN77F51UWOuDDcgZdP7AO8VITX4PXL3wVTdNOd4LPo2g0I10l8JU6wS1EW1iIYt/30L0z6YlYu4pywEQ4nzoQhW5K6LqVX20rjhdRxZj68DndMEaXCeifXJyQ/nuxk7HjyTugAHv5pKiplERn/ebjWBrSBKwkhnLJFp33RcUWAV0rkaoT8vuLZp6dRK5vZE80Uaa1tykTDeCpOwz5yusR1WYRNokM9FQSrhgy5qrh28wBs+6gYoGnRTZPX8333ez35t/eacuveytW17S6RhsctpqBxPAy3CXy878piDvhT5nJ7yg1Snogn2XlbYVDJGrZ4Buz18j72Fke2NiL45+UvGm/FGbJXytjAswNypZWU9HFUZxRiDAwOjOJgASoPl/MfVvITx/WFCV8cnwEtW2Exgw0X2vTOvNeB/PafxKVQ4QpoFICTG5QooLdNwJQedpsUt3817d/eeBpdc9chd86K2nnlts4+6YgNeqqN7a3H8fftXFyTpFQnsxcxm4olMGxYch0Umuo4Fw8uLeRAzNLtFSoP+sZMML4POYougNLdlMAx+wsZ4TwWDXDLJKkdmI0lGfgrRP1LiY69ko7oMzrO82rPeUEzoSaPRUZoMjanu841nhpij+JyDe0irPo9FjFrjz7lGQJuHSHGkY3QSj7dA6Fbn9uJ/bgfZuBUlxnVwf3RrrFgiqnxPP+iSIPomNeUxdgB9qTf6kh9Rxhft7y41nOmoxH5p3YaFpc66kHjlwyM4N2LQ34wPoJjuO/vOTpgv/kNQhmcRdGXKMrLL5XnESid3Qk/AX6pE9oUuc+Gph9gQ6jdlrRLdEnTBbQ66mmMLKvCOlwyl9UEXn2VV0JqeKOrtE3wuz+XB7BPbvJoIwMd5cB6WSsBMC5BbnCufVTsMBuEkf+ZkgGVma9rh5/fwxgnP2kWwgYZmQYfrweULqCke46hbjNN3uW8g3nNxYGaEcAgCCn6xfq5t4XOrN/ET74GMd8BHXeZCCrg7908X0igpTBwBq1lS6DiRNs4qblUOK8uf/Hp92piw5/BzTFbJwhb8Pzf39ggP1vRbDxNGqv3nozfUVsdRGTzixs2qasIzSysx9dWsbPyI7CAnJJ+u/2CR/C0RhduCKPm7Nm/HhB0SA4TWEgZuH3kLawXVKwGnoYg4skZN+9tkmZCiJEb0CU65fqxNdRSDvCAuLfaH75gzHmu9i0ptokOx/9rFySUO9T4RE13tjH3JVQ8kCQIDDjwHwIU2im0gMexXUPV8oFSAA6R/clO2DyWkyFFOLKFPhsCsI+cfT6yyEZrKoeZ3vrvZ6ThJaiXB9mWn/7332T/hUJwfb7IZrxEorZS+gjxsh9b5r/VZImFK1Zhn3my/8zD/X+aUsri7IoEuCYQFVEAZvxTWP//OhTqJuvUdBNk6yISBbx+XiNuwHcJrT/ZgrM6qg2MiVZApRBD37LBmhkboBJgnAk3+RVZPIalT1anriltPgQFen8znQZdwI9UahhiNxu5ls2y3UoW+K9+8XOW3QMjd3h/8UU/Il7YBuqKxgwTOaulAFJhqlLwCTgwonoJHbsP6D3moTPNGMze5KhQsumdbZSWy69sHy4mTTK7NNf3hExmIdFIcPDZVciIcLpezHIkGPsMOyoBg+DCNQPjqba6YQVpGe9i7hoWkdFVinUS9A712Xj+cQi6JJl/c9IjN3LYKGtvUD5U3tdZKW7iRQFZJseADonjUg3n/9SHaoCEA/SOodCrnBKdIXkhNh74p6wixwvnhX0gNrY4esRvLEBbRIfG6om2vItB1pVGPyF0wyzTnCiVy7C/M4LsEkiehbCmNoykUDPzaTfOfz+lx0E8/kZlKpX7jpiX08mWEzdUOeKYIPmSOmtRpT9C+s436gTynT6ThPhUKvKsPNZH8LyE2v224LobeyaHzvopP1HXVQN3uIAoGR1Vxtih9a2cTVnI4owIZOVvHaM/WsPSfju2Y/pzSJJk0K+2xNIEHDuTOpNIiMXA6lnnkvKDn8Msn30WY4Jc5T1A2QKZJNsQDhJ3k6rjb4RcKzzzsSGEmgWMwb2zXJdEgPEKnfpnmiC8V3jqEu9zPJeTHlF6Bh2q88diEeWl65L5jzslBvXyEuWInkfmphVL1uwu903MBCGlLFEXNOzJPPSy68wHCRam5z1aHYoRaGXJvOTGSZTCUcuIJAJtuE/6iyzvvhxgB62ffPBPlkfHwAtVvvJZLw0BBTmhB6kdxpBEX8VoB91F/9cCPIqIrpKvrt5PephUPOBcJwaeO4fZlsTIvrVg6pJYQtZsZGaIviSHJWxVKnpqsHc4Og/bx/FPkanqr5V28vcqH5O/xXVp242cnj62n0h5LkOwzr+y1vtj2diKEk5leC6PEJKPfgboGcEt9JO3kGX4pQqlbTT1sqAjplQReM7uHI3IV74NAjnefzMCJ2q22W8/2sQz6tWHwyh4HCL/2d4owJJDlXOTxmMB+7tphW1mb2yOLt4zzt07/rdHHA+0t3CL/dPR7+XXmxnK4es7Fh3GWEE551B6AutJpBjobzsmnkIe3VCU2ujEuf9lHD2FK6hnB0bckzFWhBM+MGrnARBkE86IC/BULyuf9Kx5q2KyCMa57roDKAxculK6FjQlhDj3MgJPR1SomA2hP843rda21JgcEu3br/G4NzoO5iQSR36VJ2mX9aDBdFGAGAKjGzs31ggygT+iaLZuAh9y8FEUBD7w22VKOT3dbrTzzGXknv1VQ973ISE1WtaN4nRmxWiyw45dB3Xhm+Gn+yGVou5o+IghaYzNuqZ6IUE8FbrTlZJKxNozq8lY8R/LaiVLAIGqWgSFxRsruw0CZHebPW+mEuaSVAzkvyfGKz6Im4i0b7MmYcRCrh5NbC7G0ysoBcLH2wNc8iNJ8FHFvtIC1/9OTc2RXodRQbSBX6bac5AWAy2zvA9GnBOaE7UE3vNpGddP07TVBn+Zk5Cd+VYdxstld4hJy7ssdauz+Cy5HGAEv50GOGMg6oiOCICVCpvKlXFriCnRgiKA3nEDXcXNgRUylbAa1TewhODZ5V4ctqHdEkks1hOj1BwlCu5Zl2PTXTsrMApIfSUXpRjpoag8i7BEeoh36kqZCVGJiBOONdajJdYipdrSS/VYLoVfnHQIGS+JYACnYYBCq+6tzLCyrCbDYR1AgC3RvjkS8RrMQLhLVZ5w9wSLhlurXoyP1BHYO3ExW6VAYVTWg/V+SeJIoonnrPfvoYNMnebjOzdZ3zeJ5LrfjskYYNt+wXX1QtmOuQ8OZ4T5hGnCrl4Koy9+Slx4zhTULEMqxHloEwTuBxcyHpiV80SMjpaHhTprwx9nDxGRk1b25Ae9i/9wAtKfjptivFviUzPFoiwIliq9aWH4koNJlH/FLnzwmQUudl9hb3U0+BZ3qbHNfoxs2kzfi5cWFvMIWfyDwx5qGZDylY7WXxMYjY0BTzcXLcnAiIkMibDna55ClPJwZ2OvVXlNKmdCSCBZpq+OU8QegX7vcEpZsv2+bRyAqDxJ01WGzu1GZ+NCyaC1b9gZqhFRQ3GR9pavhkOT7baPE3iH1+WBTa5Rl8Qh/HtFacrToDYO+qhwaU8YNJMX0ox2eaah3mdEc18jIb4vEUuoxwH6tr0NizVJy5dBDmItZ09qSYv3Uf2T8McIG81MIp9AFontCx63nEhKY3GT0UGDDfvr/rIRryOP0Xdd0Et0VrAXqYUCMUIUxGt95kXeWnq9PH+fNs5tpHOj4oyQqK2BzF46bIPy0UIJgDvQXiRUEUgasJryBzQBM0YabDiAdQJE7dV5fWLfh+A5BPtdf84y9GpYpR51n1bLaPjXhNHXQbviOum+6XOkXZhbIlc8qeTLA8Iew5z4LdauWKJHF2BcFD1TZCaWsDHzWFQeNBqy9rLyAxyJLsy349gC4InXS/VQBK29O7p8E0XhUmU3Ani9P8Ug0GwNONoM4SVXiIW5E82SUWemLRVCUnUT2ApCHTqSoIZ7w3NltrtzRMKw/K0o5rRrOVD+GoCUGREoi+8pIr0EUqxeJRxP5SHpOs7JumOsXX2+wJuh/ZmL3NDg3iJXTiMeWGNHQXwFDI+mgprEBiNp0GZzP9PLBeRs96CT5ZbrGKBl5NUvGB5prBx6I011e1oCpQFwUxtEOQ8H9tEGQJqUZ3MNNUKnSU5t7Q0B3fBA0NlWh8CFHP7fGbBtPbUpSsktrHuCz0iJEB70T0umTQwIxAAuvts9juig3aR0BQ+9KhN9jkUOPJBt9cBAe5ppttRWEJT62iAYhMT2pFOvhYdao/uX7RuECZdLC7fIlO9AgnpUq9KWO3rm0hcXDFND4K7KNLdO3cNJvQg7RSk2amlcV9KV3+rLknRsA/bmxp3UdGLufq1NME5SHoqIBgfGpcW2vEyq/y7olFhE7RgjO7umB+BLnk4+hBpEsQqL93PTxIwnPQOpxndsIlxV7/yxnEYZeSSxlzFw740K4KmiSyTq8IVltthqJdEvL+Lts08AOugSrZ+iZ83KB2qbRJq6mr958idGKul3mfzynNiZ8/0+boY4eERinFofYQHuywh+CS43qQNI1wNT34SEmF7O++xhJpm8PhJDuoV5US1RYDSti04akrRgistgTb8HKIbuKWVhq0s2os7GhzX1BoxbSMqnBIgcCeom11+9gBRLOqlfGhRn+sTGOsFn11v8w34xEcu6CG0z8qbsmAUgnCjaRM4+VbqjsqB3EJjswFpIyFQDMbFuVlNQVub3A5pqF1+9gvkTe5nr1O2yUyYuDsKSraCO6eZLfcLvLScMkuSXgn49H4UcWHwQzPuTgWenXquq9TWlSgPPKcmSpOnMdT6F10N6JzUeM5rzq1XaLE941n+zlBxtTS1Zv30A2mMxbBsr67mgUGlvgpRMWSRsXWuoVpLI3W19tYAIshbYmufLFGtTgOSpZ3n3Eot8+HGqe87YBpL2QggSwLRKkBmamUk1MBdAnm9jmeEdNPZFn30Ty5g+yuRkuiqFEQMhcXPgB3LLMO5NPD/KY84KyY3kvnSHCFgoWllJVg0fM6xhJnWUtAV++ism80GDz+b5FRJ6roK5cVxOP3RzOKh6ih34iaNkT0ZTo4teDVDmVO4gUvCZA+2x3xLUrcvoadpQMEgwu+NwZW/not6w6n+ftVIPbOILOTPJbQTjfbU9yKunC+flwxTcyCrPr+1Ur542TiYqT1F9LLqPX2WDIbbs1k38HgzFFZYOLOW0LSSynYN7ItDtrMmoj/AR6tpqj63XSukalgcrQf0pI+0gc42kai3OYzxyfhzXh0mECbIVqKEbme0q1iNKP4ht7L6tfe5m8/napan/SEUDbE+iVlJAEsRYSbPN3XCbdJYlcmVfJmnx6IXRvsZlk2PCdFJ7z342HvN7Q37yqb98VPaSH6tbqFhZC7OtvnNLi8OqtjzONqSCb84xo0MDhTgCgWy+jhOmtOSfksONJ9HTPlPFRIhasNVq21xb4Tfm4ubHFYn8Iki2eZEz0D+owkXyn90ctBxdCd4DeYVKcY15kv4NcF2EOUgh1/MF8YDSReOJ+jSe0yVY7Omri+HM+i2j5jqXfl3NwMNgIgW4yYWqfj5dN7yaKLojnjVN031XnEpzxzJqerNWiakDaDJtEKSuWOirHvEgUXWlN3FlfO3nz/45Erpi8J7ZQ6kvWLnN6D01G21t+yY1FhcKjzm3JirDPn1ShtgsFIQa2RbP/h23GnRzybGHTNxVtFbzdXFLGVvDAy4ov06YvP0Vf6BE0/w+1DnoK3gTdcwZa0Uhrgh3bZo8nJBauXMb2rHiOxTaRCW8FINqF5UKc5Wreuzqmv1n5pHaayE+xPqN7tCb66e/04AkXBtSpKc1GahBP/007J6CpckkUtTjLNl5fPiNTMhySR1yfqsCL32BsP5FajHp7WDBBPgLV27UFt3YKLvHlo+qkcinFbcnPMV1mtPzlpHydskMpWKsLntbZyEuXOA7h0F0PkUyo4Uty+/0qkMrko4zN1ou0tTO1eoOCx0Slvoyow0/esK5mgICkB6bs9puo+6KBRrbi2lGJkYe/bbRRqxDdyHZeryg2r8yoK0u1BD/UzyMVCXVhy4LF+5ifl0TNEGFFbG3d2df24fvVuDMHaNU7bttjiYa4Hoe9Guoc4Nzft8PHc8fLqtIG65KZusN0o9w9ns7xZU63x0kYGHZVoWgt+AqeIzRSZS8prLuC0uvLT9jeb4C1GcTFyuZrm4FvSQ0vZltHQIMxBCZcxQLJU5u1rS1stEeOHAYOUrpcA0HNOyDvsaT8wrKuZI3uy21JCBoUL6lle95+znSKEp9D985ZcC2uHanjbkE7u3pxmPmVpbOIxWPIGo7u/E4kRpD+/1uCL8xvsf9tC41keQ6O0rdoaLWGVN779DttUIceS4F/bl5qxMmd0mps+gVCY4oOoOc+0thRotUWVFUmpb3BhFlRLD5W0sDD4pdRxk9ETbNflOPXjtjkG5Xb7HKo4NPS9OZLjZpfaAVQavRIChvD+H2Tey9Ud84w0pY12jjeW3RyIJnSVEaBEK2Jzkr//PYBRArhNDMs/vDHdxBdvNt/nSKB2G0FbhJstTccJ8zwchliHM6kjJac/8NgPw1LakHFyTG7Sm3NUgOphJwNKwT9jfM8FbOhkPBMpqfKlfQD+pbnqfD1sy5FgJYWo8U/k9AeBJnhsKjX60YeLj6cS15rLAI2mc/bsJzIk3T42Osa9b7lGTsA696ZlsUxYm7E1J4iZxIIU15TWa8BpyP73P7BAOf38qcx5aghzL0qC5DrJwZbNDfonNLyPdhpQyVhedsxiBN+ZemxXyjSECx5ntgN7jC3XQu6WGB+oGQHra1zmOnjQSFoETPTQ1Hhj1rONwKPoJprOJ623oHo3GayFelMmJLbE1KRjrcIO+/oc2p6igVE1OhfROKABzsNyZ8sR2z+ucraphiJEm0Fdzild/eUCAq7Bps+sEuiuh+01JV+yFbDnITDif4YURZkLrJNhzJB8q2Z91fWm6G9fBg2+YhKoPtkcLDYAg9OtfyY44Jk7JRchdVGoBYycIx4ubH+Sq+Ty71jIPQ5FT7tgweob+W9V3phXzgwLM3KHYqqn5lxNzyLJZg37zGSSGtLXXKVhuzhrpou7+GfZuVIGu2z/WLlhzqsM9pXc8CJBOezzfrgNOiNtarnuTdtGCFVd4pEpmduHDtN31R3Qyb41Ga/3Jwa4QqKKFVbEGdA5LZXejjMRELltbVLU9xxrJCY50iBIGEMYR/W5ODW6DDV2jymi7syTzD38MyhU/NYaFa7Pj+mZslCOqAK4KcShhsJQ5i9ystHWx7t8n46xLw/wlYeWPYWnzo1sy4VEkpcgdwx1L/ZJKKn5g/CdbfYarrbHe6Cgf8x4pOO6Z3PB2namGCweNB0koocexo9VcyuWPeC0sNDw5aYVrqNaRuAU4PBe6t5IltGHFUcbdh0baLWxUJX29wcN45Q1F0H/qOQqOT0MmDGHcJWGr2hYwMKiAGK8qeFWh7Nng0mjJKAjhYw/LVZttgceTCvhiuGL+WliBRhK21jy31AT0/HJlEcRQWdlEx6sYxpQjI9PTm3spuO53z2WFBtiWpWvCfSpFMhYZUPrXTgimQKMEZMvnoOLhqe4e7N95oDg7FDhb2nqih4DiSoAAXHdaWqL+9LOQ3EOtTrwb499+mNO36mVun/9U2UqrAzPmQVbrXu1DRKiJWUBYqDi22MIY0Pl72M6n/ntkdoHvC7OsfRxGgmYA1oH+oIvs3JSD99SicoXWqM7MkE31/e9BPycdNJ1ayZH2/gG9DpsZI3zWWRs4cyx018qe5Ytj9MuAb71OLA5tOV73viHYy7wqY2K8aaTqdJR9aiPF+9bG9t+HNrLaCdWx/ej1IO+nu1flp2pjLbEELsyGA7Ok19NDo9lJOMLDo6ucNbscNxa0CxMAH//CP3YonkcE79GNiJ2mHAqVkT60xEhjfYU/4Espci3lvlLHG6CdAicaCX/QlrvgfqhAUNfkwp1asiXWxscxgKzfifJBe9fR0CqX41hKHA4Bp55TJYIXaoOtxkPinZnd4wtGbHTDyfz0bg6KSPGdkqT4cSFqkazEU9FY3oym/YRZN9T1LrTy04kJsjZ16y/8B+cOtCq3VfOjlIUxsKZ2+HbOa6MdhVRCU3EnkD1aD7U2XhyeG1PaFqGWFCKecRHVVWRMtQ3QCfwpWiCFOVb2tDgvu9mF+Y2BEcSqp+Q3amC1f7OnjZPnUAwFOGZZPM5kn8eQ3nYMq9yDlV7Qw7AaN+ws2ZCjEk+I0K9r5Xm8KCDni+40uMf1lKu273dTDGTJmey93rT8Iw00kvFxcpCqtGlj50R6+I3dr2LJfrXNAg5+BW2weTI5glcxD83RQanHrXy022DlKET0jXtR8ZpxIxqEZcm1oyTgHIy6YxYwCbK9oH2paulIjOoABb/2SBBp4bYySRLlwm50oUA8G8cJjrT2XXYcXz6slTzYoii6LJcDY5DjFfKkA8hi4OYXCY5VdsvFva33Vd2yQ8ZRciqHDIBih1pY7BfpX7ZQmSrxpOOvxbfmrWUBFOHkRJ1rBcaim3REXDzNcqe3bdNyWDwzYK734ShQiH+LzYcx5BZZ8t5rxVA03jiYWK+TFolGcPLm6yy8mlYcvienGSiNMcJnrblnRTeRHewVCT8sRG47xHi8x/e2zM4JJO1ka3R6KvlWoodLSF7lGSJ3YLok/CQnBTZ0EG1kO4s+nn9hDdEAen5MfXn1tLT1FdGF9CtkhjkL0zAUf3FOsefSFUnf9yjxE21c92WzYSoiCUf1oPnUhXBnViPcNmnujRdeW4Tlv6sR44RGK+tUZS5um/3Ou8UO9UxcTCp4b3Nm0rVLzpHmtNf8L6zyfcCiLSYs4VPRrkt3ocKG1ou6hklNJKGv+so4oROxo4qsdJcp6O3mAhDvWWKn4SHmNUag1eslX2nwZqRa97DzKuv1m43OtjGjQMfXMze3bfE7GTceXyMPhKaWPTzcSaMZUf/BMon8lhQiLhWdx21bQ8Ol2ss0tyYz12w/KnKPWx6ILm58JIKh/RA60T0mooATy+ZENl7lrwqHUrYPaRf/sisSse2KODHr5NatR10h8/6FtmHWHc5x7a4xnUgfIImkv2NSY4mm7JPvahurXYy71X9YKC2a58XY35IZUEL4XDTvE+cEO5rHYHIh3OTueec0NRJxlOJfKSKA3dVa/kYQsdQns7Mid6G0uXfo46n5HdBACvJjqHLpC2Swvq3iZfipMgGdl4asrTlK/zRnyqNgHWXr1uIcSMbGaivmSoOCyyZgtVAxoajn3C6uaP92frAEM5Okbw4ix3RZCZbhdOg8mMh5pTUyrxgyFTNbc1mcJPccNmztVr1Ge++W7HP3IKgOMXDXRxa3NaY9R5/Z+OaVfOO1buSI8ECLYLhnLgvhjYp+5IMbjERcZTGQceaZLnjXXV3R4y4U8QqmxM/U52euThmUZ3L6pO80+c+mpieIqE5DSFx+PhhugQUe6Fbxdf9jxoLLpEuM5BCJSIkt9d5glaQi3WEgmYF+8VTTc0CVO+4sFgUiuAIrHY4sAXZQiS/wJqCl7y5xqyq2QicTVWCUfbTnX5PRr5lio67l6gtCrkM4FoDBWRal6RwZAgMweozkk/6dfDicIvQWTDDEp9jv2kdBZAnasns2U4+ztzogd34E2EjSt2x2NT462dP5EsjsE1Uxmn5hMIais8E/YD3Gi7voKamxi7cdWFktU6mthszIWVJmfqMfmaX+mbRKv0tQhJ92x7d43zZRLYNAcNNe1UOKm2rSiA+uvLWNxWN1TdI7YAa0DyfwraSzIjl2e9kO3wWidj/DhNcz+t3S4Q0xdrBom0HrYkgOjMHuyfks38syWGViXUsNLgE0QIy9+adzZSAsQDL1QzwH76by5/dxBuZA9VfVWmqeTH8oDdmLRPp3H/+aKHkxLKN366t+VP6CO6GWm104Y1ur21Hza0IZfbCpPnGpOv6njnobn+ZzhBtttx08v3DH1FLupDzVtt08DXtFobP/G9vk84xGIXAqiNQ2of8uKzSf/qF6qhMTJmcoVP+jcCFugSHBPrmFU1hHg/siyASktPw0Hsw7YNCH9rfOBzF6jDPNbNaFXzmO1unu2G7siz7KR1ILBIuMVCC48Py4G3K7RNLmBy7FYd9PgYfprNhar2P/Aijh7QlVW6tqh/9tHJMHc+UGfkRav80QaP/S9imTss8XYdkJiTDFipBC8FmFxj6FDLTPWxl+SxOwLZ2v2LLZAUh9FobitmvlNN1prq2kjS6hVFtTyTCAcxQua+0lifK+trUj/9dIUnMVQTe4YuxSYiy+AAvmh5cKL58s4VMtMpH/zidmwK0mKOwrIDlGWEyn7EqXiN5mdHa1/LpnJD+LOECUvNlBJ81GMb3m5UDIsWMiXwyX7yLSXyhBoTPGLHXCFVAxAdDDPRtlZpi8BlzDtScGcCkpFzqJDisogNSPkX/tPxKNn7y4UDZVZ5NPAESeqpZn67NiPBfuWxiWBQIazbcBSwSTolQvpGD6eTjY3G14cuJIoTwrfWM+vpcOCqCNiGzB8ff3gyi83CMmiqKdvw270596JkmHiwhw5hu+hU9ASVNkkJLOV5ZVMRYEZlY4/zEHdgtciffvEqaA2i8uHjt6QaUIlD+ZhUOKuohQVoAdJM4GI2FXi9v2n/umX8N9ZSjx2XyJOebYFo25rkkXEwdkJFjAri3RrKcX/v+1yiMZlFhx4dwFuf9yyiXENoSFcyFtjYo7SIP7JqQhd8hbs8BZzfdSG0NZaYQua7HJvEtnW55+UY5jpU7fIWL5fiCkWK58sRUqHdecnURYto77TM0frGTFQVHo4R4RJABffWQ41XgKjSr9P5xyesDM5Crs82Bi+28V9e2bSNsSUyWTS9i7ys6ey6iOUt59S/SxXMalWGQyZEmPm9DWSYkJRaBtyxmJ6Q7MWhbnRD6Oqq6apC11JjMw0XFbHBDAxfuvYIX4P5Pj1k907oY9j1Pw3oUaUqoZ2+0iThf4iebRm7KkdR+vAFS7LAozK9NNqiBYcSROxwPanmP/f/KqFJyENvTXW3r/dfoFLKVYzB/64w16He4uEgcCdzUgzEDXy2xOD1q48hQKZalRUh3AoPpFGDPQ99ZI9yWUltdivf0OUzsDZjlCCe4CzY1CfKSTYrVA7tHjrq0NV0N8Lu2LGSSDwl9y7+CXmSV5dkmR0nP6aNkSPi/ahWm2UfKm6GnVPiEMYNIwJczY4lTPjocNDIzNzLK4QDTmh4boxmqXIOmi3/f73c6Docl6bRmmMLor1WwZq6uyVwxgbRRrjo8UuhCvtvuVPV8Kmx00pI2OA8o0DJDbIA5yQ8mDzCpn4Oa3bKO+YphI76Vv5jVRChumjll6ELfhqIVMlNBZrjHMj3C5KlBb2B470Z7I9eZcsQyovEnMU/Daf+UgSYbYf67Z+CYJ55yXh0/LvF5f2J2BDUYelMtoZW6zx+VP73rLdzjG7bJ9OeoW7S4PuuMwMwz14dIuuRIAhSQuRUYKAF6S9GVm5kBBjF4ZteBC6WSOOTL8Dv78xyZWTLgEJpKuFhxP76GfYk5I87FmfNeC4aijtVJnSTEn/A9l66Vig/BaFxGeS7cqBGqB6H2ZCaknyaHfc1MJseCUL/Phcftp+1GUzn6geQC1aOZiDPrLGxbQZWET6H0sTHNcRpaojqX8Znal8vlMOogO96wHCHoLTBeQRt76M6vAVjSeLBUzwVwx5xkf1fM5caBCN/o4yKH/XAcUIAIBztMs0ISiNW17GuaIVYJOocaM9sybPZlq5k5AzU+JX5TKEnEBG2CKc10+WQYvWt2j5EdW/9RHZug6dfXwk1VTNWqH7bn+MX6mp4mgpezRqvk9w8NSo3/gIvHGu0yzoFOvw6p3OiuakpkEgbu2RbBp2n0YFCIX0e6hPiJgsWyaohxGbfL1nP/uOAK5VXVleGpc6tTnKVTqYfLcBZpyuy4h35gwF55FfGDCq4ajyFwZEG+iBOZm5PTD0kp9u6f0W83SuTAdsu8Y42H9L2PWiQUX49OH+SWpLokwdDXQBjt439ouJghdLHHETHXBKFaM2fICUfCxkIeRmqbZpvzpr2PcPFuWvISFA30R4Hlus9Uscy17cy3sU2Ba+jtUbXUCUJKyzFiWDWtWoQvAjW3ZLEXWGybjQtzjuprRLi+G/OVT2IwRky3f73d1ZSHYxlmdkkZtrv6aqpkpbU0/05qT2WmY0WEDHUlFfKvYKJEqUlH8esqlJzWIzpqnmZZWOYiGxvd95o9XuDP7KZgTrasnlb/aInEwte8wPKID+Xg+YdRc9H8Ak4/DgdkEaj10bUquZK3se8so97dnQfvRV1OZerHatcuK/92dpWIgVYxZNv3HAaJBsL3YTA+sjefdpEd690UtofjWD8rDvll1KQRf8K3djkWQ8Xam6B+/jMuKMtvj6SnzDWtq4rXQxTsPTcjdEgTPbNJ4MvQos5uSy+8APNXqvn20MvgUt3dmPCQWr8IkK7FMvQUIjYULq10P/f9f8/8MjHUHItqWo5JCh/y0kONVAoTgbanTz2HNyLBJihsj+Rge3ARLFgqRMs/x4AESe64i/0gKnyGmoup4pc9Jvf/tRnvUgBSvsAY6UERyvNw5g7f+YYUTuvZqu6QHPFwdmyyODFpiI7t/i+iT6xJ1iYmLqPZcLGPQGUS0Lu6wONN/I4Fuj2RssCCbcnlr7JsXrYd+PXmbAAsa68+4bCvGwBnj2J/pKvvIDuPoB2+dcrgnwYbHYNTpk/CJXc0YmJf6rKu9liDYgd+XPZ7SD1JjbMwHj0k4LzuyhjM3D4Y5fBjm4igB2PdnqljxlLyEe+V+Zkuc31pVy5EzfPgnlASghq9imFw74z++tOEzTQxsq9ItJyPbcg/RrcJeqrTgEDcnzJh1zNCGXiUZG3acPFK5BQX12HllSCnpP7qoOUcGWL6lIuinupSBeXC3Eq4QEqlJNYTRrNNQcvGO1hAOzNxeY+NTKLZp3Ttnpw6BK9HST1OMpUUYGyYjffmeM0IB/5D1CtNUEo9R+sep6qnHNzSVOImYhLCYimeshi/IDVoxFieWI85odXVEJn3oE+fkaGwHrvkZtV5w3B2ZtCEL58UGZtM3gME8g3BnK0P9RhY8CwzYxneMbNoA7BkkTniSZ3tJRqk0+uwqtiPV4QOqhC3r+WUYDCOBiNpqFYhAn4ZSRjBcS46/lOtEr9mIZxhHq7zvmKMJrx8Fav2HOSOPtczYK/9cz5zOgi9bMdyH9MY0cRVByriI3sqdw+w8vIne8hXeaztR7oQ5Y/JtfBbfDAxx8eLFUPQHAOFP+38OL2L3R71kTyZ+4/M2WMPUJlBwW0dPOMQbU0KmUnFMCCLCB19DBLKUt8NC/3ZzpWfnSwm2uHUjLVAv6r/iHVGKuDmVFKRDZApklsPHRCLRAHeXeiHY+aHK+NzloEkW29PNq7FjNkvhUUukccwL7WG5up/wvdUWdh7Oglz9PFGjFbGWSNFOd56gWLCl19pGXR+xgcHxXuj5kz7DLZUqxZwOsQjw0B6YGc26HMHjboMvVY26ulCJM+yRaNXJ12SuMW7vf+fM2x88oO0kU4upc9iXcjc+U3RbjC2nGCCT5VldhrJwphvuIZVnxWVu3E8e2GxV2NsSM1/cj2hRKTcbrdUWT/QukEZAyCvNCvw+qKk1jpopjSqQ5ZowldgWLnVUkia6MXO72lCEOom+PufPUdqqff2SIM0c9qEg0sMYl9oHD9NMJ09DcA5U2wROe1x5kD6te3jSJzpRGpb6eobgZ6NF98aJPjLWdR9Oc8gOxV7OAFJtAMuWm7/nmEi4EjTGVo6bStIBAXuURo5deEuirVj3Ey0HjuCjc3cJ/1DooOkyCUMzm5v6DzMOZXX4CcR4Tex9aPfEDdwtBEMvvfNv5xo4w8KEvH2v/sodVx6jZKxtnwRplWIbsxp+jJNeYPZ8/YWkJkNLvaV5jQ69k3vsEKxOPmnMnJIIGbux7ZcNo4uOGZHvobFOX9InRdPJXg0K0zbAuyqUhcViE2EK0AYYfEcCK8Lnpp9ms4hr+SkXjCc3A02+IjmLnJKDKnKDqSh1pRDoVSZ26X35ZZXftNO/8EcsDUhzn40n/cYO1N/7+u4lPDWxOhzH5XF9k4XYQxl4e4y2BWQie/JiTXsJdvLejHoZdaxfx0BNj5CF6WwHweMCLBo858ff0Wge2H5oXrIh3Ms2tx/JuxD46djH2TAp2HwX25ILtbcx4WQC2qrabz0WHM4pH+JwAOOiU23yFvUc62DhKav1FpffvIybKVdE9woiv25itob/9z/x9BfXTCi4m3brslec+OoQhcS0qgJWCZnkn/oPfwWs5LF7oeFwIyBsK+aDk21iM/4aJwO1yFB3DqdlhCqbMyTjb7++2HfGa+fqTy79zyDYcp+zE088Zd43HbTjeNalihEiSEjfkQCYT/s1fcMW3bClPR/uJMVkcY3l+4uTIq+HMm0rze0rxmjl2ucpoI5OJTJFPUNYuhQ4/Zb0MFW2lcQKp6rxYgAyZer3JPUh9iHcSpmm9rpMrwjPvBU6YOC1Bxi7Bx3DO/MYA69xj45nZzOgNZvtwenvevA02uWY5o+0rN2fKSvdDY2r+6suqyYdqbvjtNid5v+XdliW+s8cExV4eSO663YuyZct7lQDKaHx17w+POwK1Z6YDK4I7bH9HQoo1GFpC278Xwb1THJweOQiyPhA5NghKNvT/4hfTSDn2SepdNOCRGcIn0exXg8xhObw/TxLIGxXGun6WjkYXvW+W1h3sQ41cO7uoqxyjOZILoYwpLZcB4RIk9uf/kiOIn5XrcR69Wm2Zo8WmsRRkczXu71W1CG5HjNtuqp7c07dQlITeFjjOOOvkOppKcvw1LeCd9Yw6IzW6utd1wQs9XU95TOZAHjxlF98MZdnNAisGaq+TjmyqSaSmuTHlOv9MQoPd6aV22uLL8pHAOGQznOjNpN/pbszZSelLWtJaTFcI1mFXiWSXraHQhb9FEN3xjl7J9Re+OlljPpiZOwXBvcNHLIpgZVG4s5+fPxYy1B0/TVXEA4Cd6iWjMa6ouJ3GbMbU9COYTbAV4egLenVqg7tMw7UwrJnt+9Ry7NvFbs7KhZlyatGrUH6eI2YL+0ByLaJ91gMt4T5FLNTS54gQapuWk78YvqsVP65Y7Gz0jRCJqvmbnXDnQGSNClK34Nh1TYdw/scx3bLY7BIT5L4kRrMh6x7f6bJBjfMbddTi57rnnJgVZ+uM5GU+Xl6BfmABEDlk9fUghNqeRWVRdxAQ49bg/v+Uhg/33Cf2m2ptjLmO/3ZjlmxzGV9GTxdaWiuBZ0jJynIs6NG5elzlXTeZkyIiRw/7EJ2jN3KO1bBBmZ+yMQ25a4HQAPMiXDkzlzkRw6DImBhQLK/bDlyT4EqxWYZzFH+I5WsB/ruBJqGB5WYp8Hjv9iY+Uy9iWZcDu5rQ2H/2X+0Pu58vM5b1qGIv1oHMTSCa8+npzltLDuoUZ8ozSiHDj2aaq6Z2VbLvriNR6KWBWr0eqk5mUFmakzUFfjp00dou5VwJfF9zIYso8Boi+hTqVLNdNmTvlHpSx2XR2O3MJ1Gu4YNJ6dZM2KH2GLzleAQUsJLqRnV4U8lMDscfkaHdt7W2z48xcy6dsY6pnJJMH5iWH+w+eOp0TMIGzOKq4NBBZoY8/YhBJHfYawdtszDS4D4uju2vCYQVuxJHC+RldInA0Qko/nx+PgSmyzVZlMEq7j6QdGzWEre4s6YHhI8KVGVcwpaKLU40F5PvfhB61p8b3lutJr3WQX/PQgvy0dOMtESIHHrqCLsjuERlfWLZJPl7J1JvGezuqG6Nu8Jn70QV0mSt1oOfqDQmWXVTWvPJZZHySzvnxkOxYtCn9ncQkCjKvCI+4c1jmxjonMP3hz7JXKuyJptFbqmbaH1SEAtqiBI22qZ5eJKlWmdYcU18FuQe/v1cAIp7nOjOqEUh4MKGSWZw4rhmT6yYojdkOOwilMwfm0aHUmDekV1DDd1GV8dV3KG9v2Ou8eby06GdVznynzIhp40gF4YoA4Y0fcoB9w7d0CHQ+TUWj7qJrLiuWwtsangyusqc1mjQ0/7fm4cXLdPGFfSphXX0RMQ6AELXI4KAnaMyejXs9kLPPxTw9RNfhGhZdWoBKT8vOKrWtsUN9sUzp1OA2cBGIRPCk2Spvu4Hos9BATldKY5sANSEZ3OQ/gtDVEQkCLMNs8p2ypKkdfN1chLnipRLmEwc2MomD+RGtj+rg56dLHQebjg9XH631HrrOkokzpQhT1OiNbxwouU+CPiX6oGbZzp1XzjeypvB6jCTUQbYAWbVOdXzkIWec3EK5v2Wc8oZNKi03R5g0RAAOme/GDGRMqvE9I4rocb+3g3P+lFIBHA8fecBme88vpVAEEE01hsLcRrCN9/FdTBnmbWv8GbtZFarH1S4e+MNlfsrntMmHj0Nnqc7AAIF507XO5ji3flGHQpWS2oytrctjvzts/LD+XOes/OpJilLXbwhbdnJ1oQUtpBa9eqVgsXwarZAyrJQTyM87RrhkhEJ1Cs8FJoITT0oC7dOvy74I47KtMApY9uzqXu/0a103YG94UaF+d/z4/aMIPDIdZp3798v8uPsWB36ZfFFKcIdXbRtyYc5E2jZN9sNeY8NIthRuMPYkmoLUNrYv9ZLJ7rsS69pqMUYn4tdQwgULmtQ6fG5Pjg+RSVSjVfs5raR2am/p3MJhNDvaSpz6O+QKI6R9GDBFPfJyslMFA5n08MVLoAOUkmj9mMUE05eOL23Qp/8HIaW2FqYCokrIZv5If57JMCfs6cse29gbVKtR6TqqH4qCqzxg2fg1tIxEhfMaoK41IphZ/D67Ft5mw/YRgxD3d1ZVo9/wCdizo8gJfvToXOd9aqP4pc2Hc9mTNz7BfDs4oSvb/A93MtNWESbKGAAAAAElFTkSuQmCC","top":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAVIAAAEKCAMAAAB31i1HAAAAkFBMVEVfWEa+vr5fWEYICAjN0M64uLhJSUnN0M6Hh4d3d3dnZ2eXl5eoqKhXV1fExMS+vr7S0tI9PT0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABe/IKUAAAAMHRSTlMABinIFu7uI+7u7u7u7u4g7u4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgrYF3AAAQgUlEQVR42u2di5qrKAyAsQFB0M7Z93/ZDWgvtqhcgq0Wd78zMy0C/oYQIATGFq/LBVQPF3uBEPgLXK/jTwH2x4U14wWtVmZMeLtAXPGC2x+AifDmx48GE9i/hMA/YUwJ7ZjeZgudEb0RwmWDX7MxT1CiV0Ko3pWPd+PNoh9a3Zuh68WUtTIKppoZo1u8OqPawX4vpuLZvZrzeuNHA6bpbp8iBldLvOnvDzCnwdjyxLVjsRfW3VX6lvX4C8D08+KI3pCy2+fPNbt/ZnNzjwfPPxr3Y7pzSjnl4bJ18Lquc/kAY1MlAEyPSGEs3+VlvzfCjAmb5yLcrwZ0Z3qFZLV9AdN3jD0/16zi6i4LI4pZnQGrpLBuiBhrEgHUlcVuxS5c7IF0JeW9Wt7Ld+eUGp4YPae7v6vnbJ8gvl747L3oZ7mNGS7VGdsU3Or9XnWXy5gT/qvCeGKruYSlnFUwLKWHaUji2GzfMARmOLbQ8CKQrtjm1AGECnMw0uazSMMzTChhU1KtQmPx5aXX6zNI6Yja7sBsKNEUok1GvRjjfDM5I2ZKxXPMaqXxX6KIsrA6BtSJz6DGECiFNDIv7ADJieY0TZfuAbUhQLpVMBnOW2YAXoNqgBigb0WnV25MLLlcvCfy8bcKZ6RSP4qjr5cSkUTZVkXj2yGXMlaoVpJHE81SIpd3hWpyic6rmqjb/FDTkLI4ornWw7ucxhJNko+NirlfJM/UfOuQqA3cB9LLiz2vgIAo0YUGQAbS4IZE9ih+Me3ymz0p1JmoJqv0xHFFqkV2gY662ZNeaACE2ZBr1JIGvzlMZ739lxEdZTXeLI8cMhPV9DElevvt+n1COkGNnuXyf1v8Oe5Mu1Qh3Qtp2HA8YTok3dbbqCZ8rSaNg5RMlCVVIyCJObaQzlYXSjxIzPTvpE2jhZR9GdEtjcmy5smibhrnTi/HJ+qqxEogjb0JF1O/G2lMnRgrwJQRIi0yl16QaDJSllCBAKSxVgnh+J2KKGuar0DqVkzfhLTguJhz2ZQimqpNWUM6sYr+K29IAzLeQUKbNCy0TFP0Hij1ijTPLguZBqEHmjN+YtsjoqjHR8epFKSsjIAy4h4mN4Ok3hna/16Q5hu7XqDlcKYsMgVmkaRKh/ZFSgusLHDJS/JM6V4i17CikOpkpKFQJeeUI6S4ldjMF5Mopf+xFce/AoveJI0ztBZ0C77BRK1/sJ1/TtIoFFQJuvUS2eci/Qdp/R6JQ8EXIWUUQyfdabRLr5BtihQlmY40r59LElJl3d5vU/uFuuPzXatIjd1fQf2qfxup3QIjWFGb8beI4kYLu90laA72xU+5Il20SnUvWgYhIjr6fv7AJfO6YrB71tAdKqjNy9+Q1Fyk2g5IFQSq0J+AutkcN7oea+t7pXSxwPND5ZlIh8GnS9cKPL1S5XmjGpzUHx6JZJjVxM8tqhsyszk8BPNkRI0rGSEqnP9wB7WJtH829WWwYX9mSc1t+eIZKY8YKp0XanbLnw1IoyidFioh0gA79/V9yt9r+RFIw8YOv2CoZvZPDfyaKV++5TeRQ9yKNADpJWqIW5GySKSstvx8MX1xL63aNN/aT/Arry1/K4BMRUorpoxpqEgpxZS5kCaVIeE8NH7dgs+xvIppIlL7ddtOI6gxMFxdw88T02ekGDsSgn2t6kJpsJRWd5NcMbX7x23E2nQH0yqmb0QFQy+eTA/TX5TSZVZwZUpB4v6fUyPlyUjFU4So6r6XL6YuFsdjQFqRkrT8p2251ck0cuZ4sceHAKRVTMORoi4VwILmAirSsJaPSKcdJdW9PNYyZYsrpJAcNeXXxXQVVlORUiItvQOsIq1Es6dOKlJGHlmhIv0E0oqPGumP2aM8O/5HRZrmaZeDtPbzsYukf5Voiu/imssu/DhRSdzucdrEwG/LKDXSLSn9Od3JOUGIzh6+jij/IFKKqKcCvk5G5ecKI0C61vC/3Y4pUBjPR4ph4P++T49+DqnMD3GCp+h9Yc8kPyelBEiHxCBm/JRSyimQtol+UCdFSjAPtYT0sw/NP6VlToz0Q8qUEyAF1bIUovKc/ZPMn4C2UfdYrpAePiiPTGt7cUij1I88zyCfAqnSA8sS0jPsjJZpHcRS0D1v6K0m1EN4lz28xQvhiX3uUpiowTdtElYHmSCiGGMm7q4d3hpP7BQX4+zGI52WENPbPIaZCVyG3CUgjUw0DBdCQ+JJOtH7x/huEc32CZvGSZG2gwg84mneFHd51r2iLUxSGt0gFqNtjoE4IpDKvVYq5b5GFCdxN3HxSyHgFN/9B+A7hkqUhEhBGD3cfPVDkXJ2ojY/a/gkQiqE6Rlcok724uVx7hyyRhK2ezSiOuXb9/RJTco/FB5REiGdn/cUFLm4tAr9VFQlTuQLCfMjtLaR8tITpfwwy11LcYtfTiXbZFp2fYQfKCTy4nzp4D/o7RNCyg8VY3ZlnUR7T3j8gJAeK2jv6pka3nNIdxdSfhqi1tvEdwDxzkLKD7bYshFY339M9q5IDxanfytusY6IDMmPP/gsTxQPdf40Un4qER19orxIfW2/hL6TJxNRd+LTgpR6FKo80WCpINJOrSBtyjb7Ix4fEYAUJ/dWkDYlhfSQUacDkKp1pE0xAvyYJxzRIq0iGobUHkC8hrQp0zXLU55Ceh89CX8s6LoVP/VAcMA4URUpKdKmIqVHutrwK8R4pH9Lpz9UpOlILxUpKdLlmaiKNNWI6lYbfmWYgLRf6J6qkCYjFX6k1YTKGT35Gn6NY5aB1DsFXUPD5UxB+xZKdt2UL0+zgH9D2nrX8Xdiyg93hHEA0rb1epvsgZQfcRaaAmlT/UtikfrdzMoylZKftnsCPWivM2Q5pJxLfuYeHzojNpE2pGt4/ORGFC7j93NTvxzS4+MMRDoM81n9QhGjpDzJWdEhSPV8jF8EKT/P2dsBSNEnCjZ6/DoqjUJq1LYRVZlGIe3NsGXqV6QxSKETvd4Y41ekcUiV8Eyb1EOIc5BqpdtFL+iKNAVpq/WwvkJaiUYiHbpuZUdJJZrS8DvVre4oqUSjG/6gVcQmnXoFIG21qUhpdWnb9WdAut8kQgjSs0jpTlQ3PU2UNv1pGv4uYVG2h/j9dWn7w0HPaiq9SBiwTnIVS17QBz36quRSIWYdMCAVZ5HSB8lSKzJOr2xPmyjdnQLpi9NKCapjKwjYOo6uEf3hG76vsVNTnXILcTZpWQeHt5+K21X3Xi8MaQunBEq5+fdRRgLSo009bbtW5Yvqcw5hbmZwYN/nPYZMM0EPQ3rcifw9vP9eXlpYj3/Y9aY9/NVeXYoDIhygA89uPpDHa/PvZYS4mYmDrjR/hmiIfykeVXBEpPsA5SneJsqYA/qY7DM3ytMceNStezoS0k/6AQY0/Pa/o7ntfHZfT8A6/jAdqHEUpJ92Vd32hbQHvV0OZEZ93Pd3c+2pF+PhRAcx9r9gM8q2lBrcUWJg/52Oh42Atr2aZ5H24Ev/rWtLX49UGcHgcoipKH6IONCmV8puJduKaCLlGc7G3AUpukKG+kTZjUu8gmUBc/rtEONt4rDyinQdaRvvwGMXH38V7Pb8cxLSuweSlLIifd1Amo70sRWc84r0ccqbHjKR1ob/ErMY3XeGoSIlRNrrzh6TXZHSMe3QU990FSkh0kEPw6ArUtIuX489/heNoY8upj0e8KhvSOtgk+CMN5yA1m6TTpVSKqQC+3wtKlLSowi1Vve1p4qUAumAVpS4rT1VpBRI9aB6Gwu6dk9kx7oqZXpxQ1qllEaZmqeGX8NEkEipQiOKvSGtTFOZQt/pO9KG1wgxBEitEWX8SCvTxJbfaoxt4kdamSYiHXS7hLQyTWCK6/huoWRMJitSAqTGoLF/H5BWpBRSqjo7E7WAtDJNQKo6u/1hcjObNXzOK9IkpAJHpOrmDPkSZAKhVnTRTOEqjFJMjIP8tygT1assAanoOzzMXRk/0hPFGd+x5WuNkSFbuE/rv/dOXFZRjWSKDb/rHrN7vv6+KoAopDYypFJPc9BeE6pCjWFqw8WopznoBaM0zz3vjG8kHOlyaN0MUeU/1eljLGjRz1ZKlgdOya7P/LcMqY6Zfr6eRz5s4r+lTkGxoXTsLflbXRQi1Qo+swdMHn4PhT+KATBhoLSQ8vGS9j/3P6cIicfLHFETlaUvIdy7J8p3Z7fxTHtOyu2PaOxromYa/ZaeEo3PaY/JFlCwMRTUpOPkDko9IdQmQfLv3zuklwswynb/Xhsedk9WYW/SSt2Jx/TD1qmcrsP31YY3MTekF/eCldbUjOmJLVIoaVGszWRv1n/jYd4LQ8WdxSQXqZyQRt3kL2d5XXt5waUJvqIA8CWuu0ipfEIadF8TfS2vYUVlE1kdZ22kgMlFyl6QTnc2dECbyd8iP7P4GiUxzUaK9uIc6UoWTdLFOVV2NC+5bIc/dlALSF9yaVIvvlClhKxo2s0nkd7VQM7FF5AmZUajikojZXINaf7F/XVKzI1GG9EPnvZEKjmtGqHR701ZpFxaU78YUm+dMjKkQdoURep0qYDS7b6hIbqpQELzL4703xUKEyVDupJTXBHHR9pQEV3IKUHLFkQKDMoTJUTqse4SzasyRhS74BR08c7J/kGJlGwQQD8gnaS0KS6kD1+1nYgyYhsiVpeWFlJcfnpUahegqUybr0Z6N/P5uDRUBinBRORxkPKlUf4+QGMKOghSvjwi3QdoClMSoqzkGJ/zhnpEGveY6WbZVyJ9WQZm1ExpTr+gLGwBKcyuHKKyyITHUZDCA6iwu3aM6oWxcc6CuHqqzyUvNC9HtYhckKhDqmACimENewwd1Q5G4Ak7g4180ptVqL76B/op7fOUH0EK1rHcAu1N19r9+TbyruotT2VjcepuUVR9D+AFSrVyFP+QvptjdVqki8gFDEPJBBsszkaIxUvpQdvjYHr8BflqNYwqIIiSlCUXOAmQ4oPgZmQVQ5XFS6mFaURvFIY265EnBorFjwSeX4KRI3EXj1Wr+BnkrKwnhlRf6imT3IpcRvgkNpITNslQYWUsXpcae6Es4rEFfeeCmGsns71wn7sY3J1VAHGMZhX2p159KPv8GF6101alv3BNQIq5tU44lLFt0Qir5qAIUmCoNzsbHBZfn3ZE205cESlGOkNZHRljd6X100NNr2N2PT8CAjDqIWBTas6fkoM1MHovVHffWJnBPj3udUVl9EjrK/25Eh6kGMDJyYZ9R/iihg6jYmJw8W2jZvTCm1X7sn6hLkWmNtqutkVYfCit1yu2DKcAjPukM6P43sp/FOIKgEdx7us/jOmFt2MABSXcksEtOdj1wymlUe7N4crXvHH/oWJHhKofw/5rq4MwbIDBU3/UW/GuAtNTwvTTxxSw4Snb72KHYUW/swJkP8FazF4rwLwXw/eOk/SX8SHtR9fr9f7MT3jHR3C/uWNIu8EVM8ooiiy+Qjy9BNXoiBQ/Mcp9NygzSd0tJywAMxlzBkQE4wPY9KiyRDchnVJjQgfVpsTWJ/DVYaO+ItmrcLf+/f1hT4lfovJxKrxtMREeToNpevuK58XbnARmdoUxzyu8Cez9vFUhxubXGdv6Bvuy+kHbsoV6cBS3VSMQ//BpoO2wgsJlb1+1tnU27fjMYF/yjQNWt7N/4X4S9j9sO5/1J+jxNQAAAABJRU5ErkJggg==","sw":"data:image/png;base64,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","low":"data:image/png;base64,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","side":"data:image/png;base64,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"};

const AP_AN_WIDTH = 900;

const AP_AN_CSS = `
.an-root{width:${AP_AN_WIDTH + 54}px}
.an-wrap{display:flex;gap:18px;align-items:flex-start}
.an-pulpit{position:relative;flex:0 0 480px;height:552px}
.an-blk{background:linear-gradient(135deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,0) 38%,rgba(0,0,0,0) 62%,rgba(0,0,0,.22) 100%),
 url(${AP_TEX_AN.crinkle}) 0 0/192px 192px repeat,
 radial-gradient(ellipse at 30% 20%,#232527 0%,#17181a 55%,#0e0f10 100%);
 box-shadow:0 0 0 1px rgba(0,0,0,.9),0 5px 10px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.14),inset 1px 0 0 rgba(255,255,255,.06),
 inset 0 -2px 3px rgba(0,0,0,.6),inset 0 0 16px rgba(0,0,0,.55)}
.an-blk::before{content:"";position:absolute;left:0;top:0;right:0;bottom:0;border-radius:inherit;pointer-events:none;background:0 0/100% 100% no-repeat}
.an-top::before{background-image:url(${AP_TEX_AN.top})}
.an-sw::before{background-image:url(${AP_TEX_AN.sw})}
.an-low::before{background-image:url(${AP_TEX_AN.low})}
.an-sidepl::before{background-image:url(${AP_TEX_AN.side})}
.an-sidepl > :not(.sv-screw){position:relative}
.an-top{position:absolute;left:70px;top:0;width:340px;height:268px;border-radius:32px 32px 4px 4px;border:1px solid #000}
.an-sw{position:absolute;top:50px;width:62px;height:184px;border-radius:6px;border:1px solid #000}
.an-low{position:absolute;left:0;top:236px;width:480px;height:316px;border-radius:5px;border:7px solid #26282b;
 border-top-color:#3a3d41;border-left-color:#303236;border-bottom-color:#18191b;border-right-color:#1e2022}
.an-t{position:absolute;color:#e6e3d6;line-height:1;white-space:nowrap;opacity:.9}
.an-t .sv-g{margin-right:1px}
.an-c{text-align:center}
.an-lamp{position:absolute;width:46px;height:46px;border-radius:50%;border:3px solid #050505;
 box-shadow:0 0 0 3px #1b1c1d,0 3px 5px rgba(0,0,0,.8),inset 0 0 9px rgba(0,0,0,.85)}
.an-amber{background:radial-gradient(circle at 36% 30%,rgba(255,255,255,.38) 0,rgba(255,255,255,0) 30%),radial-gradient(circle,#9b6508 0%,#5a3a00 100%)}
.an-amber[activated="true"]{background:radial-gradient(circle at 36% 30%,rgba(255,255,255,.6) 0,rgba(255,255,255,0) 32%),
 radial-gradient(circle,#fff0b0 0%,#ffbf2e 45%,#d98200 100%);
 box-shadow:0 0 0 3px #1b1c1d,0 0 14px 4px rgba(255,180,40,.55),0 3px 5px rgba(0,0,0,.8),inset 0 0 6px rgba(120,60,0,.5)}
.an-green{background:radial-gradient(circle at 36% 30%,rgba(255,255,255,.25) 0,rgba(255,255,255,0) 30%),radial-gradient(circle,#0f3a22 0%,#04170c 100%)}
.an-green[activated="true"]{background:radial-gradient(circle at 36% 30%,rgba(255,255,255,.55) 0,rgba(255,255,255,0) 32%),
 radial-gradient(circle,#e0ffe9 0%,#6fee9f 45%,#1c9a50 100%);
 box-shadow:0 0 0 3px #1b1c1d,0 0 14px 4px rgba(90,235,150,.5),0 3px 5px rgba(0,0,0,.8),inset 0 0 6px rgba(0,80,30,.5)}
.an-dome{cursor:pointer}
.an-dome:active{transform:translateY(1px)}
.an-rbtn{position:absolute;width:56px;height:56px;border-radius:50%;cursor:pointer;border:4px solid #b9bab6;
 background:radial-gradient(circle at 38% 32%,#4a4a4a 0%,#161616 55%,#050505 100%);
 box-shadow:0 0 0 2px #0b0b0b,0 3px 5px rgba(0,0,0,.8),inset 0 0 8px #000}
.an-rbtn::after{content:"";position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;
 border:2px solid #cfcfca;background:#0a0a0a}
.an-rbtn:active{transform:translateY(1px)}
.an-rbtn.an-lens::after{background:radial-gradient(circle,#777 0%,#2a2a2a 100%);border-color:#d8d8d2}
.an-rbtn.an-lens[activated="true"]::after{background:radial-gradient(circle,#fff 0%,#f6f3e0 60%,#d8d2b0 100%);box-shadow:0 0 8px 2px rgba(255,255,230,.7)}
.an-lv{position:absolute;width:30px;height:70px}
.an-tg{position:absolute;left:0;top:0;width:30px;height:70px;overflow:visible}
.an-tg .p-up,.an-tg .p-mid,.an-tg .p-down{display:none}
.an-lv[data-pos="up"] .p-up,.an-lv[data-pos="mid"] .p-mid,.an-lv[data-pos="down"] .p-down{display:inline}
.an-lvbase{position:absolute;left:3px;top:24px;width:24px;height:24px;border-radius:50%;
 background:radial-gradient(circle at 35% 30%,#9a9c9e 0%,#5b5e60 45%,#25272a 75%);
 box-shadow:0 0 0 2px #0c0d0e,0 2px 3px rgba(0,0,0,.8),inset 0 0 3px #000}
.an-lvbase::after{content:"";position:absolute;left:7px;top:7px;width:10px;height:10px;border-radius:50%;
 background:radial-gradient(circle at 40% 35%,#3a3c3e,#0a0b0c);box-shadow:inset 0 1px 2px #000}
/* dzwignia przelacznika bistabilnego: wychyla sie w osi pionowej (gora / dol), srodek = skierowana na patrzacego */
.an-bat{position:absolute;left:11px;width:8px;border-radius:4px;transition:top .09s,height .09s;
 background:linear-gradient(90deg,#3f4244 0%,#c9cbc8 30%,#f4f5f2 45%,#a5a7a6 70%,#35383a 100%)}
.an-bat::after{content:"";position:absolute;left:-3px;width:14px;height:14px;border-radius:50%;
 background:radial-gradient(circle at 38% 32%,#ffffff 0%,#d8dad7 30%,#8e9190 70%,#4a4d4f 100%);box-shadow:0 2px 3px rgba(0,0,0,.7)}
.an-lv[data-pos="up"] .an-bat{top:5px;height:31px;box-shadow:2px 3px 3px rgba(0,0,0,.55)}
.an-lv[data-pos="up"] .an-bat::after{top:-5px}
.an-lv[data-pos="down"] .an-bat{top:36px;height:31px;box-shadow:2px 3px 4px rgba(0,0,0,.6)}
.an-lv[data-pos="down"] .an-bat::after{bottom:-5px}
.an-lv[data-pos="mid"] .an-bat{top:30px;height:12px;box-shadow:none;background:none}
.an-lv[data-pos="mid"] .an-bat::after{top:-1px;box-shadow:1px 2px 4px rgba(0,0,0,.75)}
.an-guard{position:absolute;width:5px;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.7);
 background:linear-gradient(90deg,#4f5254,#e8e9e6 45%,#8b8d8c 70%,#3b3e40)}
.an-sep{position:absolute;border-left:1px dashed rgba(236,235,228,.5)}
.an-hsep{position:absolute;left:6px;right:6px;border-top:2px solid rgba(236,235,228,.7)}
.an-hit{position:absolute;cursor:pointer}
.an-knob{position:absolute;left:95px;top:52px;width:150px;height:150px}
.an-knob .kn-l{position:absolute;left:0;top:0;width:150px;height:150px;overflow:visible}
.kn-img{position:absolute;left:-15px;top:-15px;width:180px;height:180px;background:0 0/180px 180px no-repeat;pointer-events:none}
.kn-base{background-image:url(${AP_TEX_AN.knob})}
.kn-spec{background-image:url(${AP_TEX_AN.knobSpec})}
.kn-lift{position:absolute;left:0;top:0;width:150px;height:150px}
.kn-rot{position:absolute;left:0;top:0;width:150px;height:150px;transition:transform .16s;transform-origin:75px 75px}
.an-kmarks{position:absolute;left:0;top:0;width:338px;height:266px;pointer-events:none}
.an-klabel{position:absolute;left:30px;top:62px;width:90px;height:26px;display:flex;align-items:center;justify-content:center;
 color:#eeebe0;font-size:13.8px;opacity:.9}
.an-klabel .sv-g{margin-right:1.5px}
.an-idx{position:absolute;left:169px;top:30px;width:3px;height:18px;border-radius:2px;background:#ecebe4}
.an-sidepl{position:relative;flex:0 0 402px;padding:14px;border-radius:5px;border:1px solid #000}
.an-sidepl .sv-title{margin:0 12px 11px 16px}
.an-sidepl .sv-btn{width:58px}
.an-sidepl .sv-nav{gap:6px;padding:19px 8px 9px}
.an-foot{display:flex;gap:8px;margin-top:8px}
.an-sidepl .sv-radio{gap:4px;padding:19px 6px 9px}
.an-sidepl .sv-radio .sv-cell{width:14px}
.an-sidepl .sv-srcbtn{width:52px}
.an-sidepl .sv-srcsel{width:56px}
.an-sidepl .sv-sl{font-size:8.5px;left:23px}
.an-sidepl .sv-ann{min-width:0;width:76px;padding:0 2px;font-size:8.5px}
.an-sidepl .sv-anns{flex-wrap:wrap;width:240px;justify-content:flex-end;gap:6px}
.an-foot .sv-btn{width:auto;flex:1;min-width:0;padding:0 4px;height:34px;font-size:10px}
.an-foot.an-foot2{margin-top:6px}
`;

function apDialSvg() {
    let ticks = "";
    for (let a = 0; a < 360; a += 10) {
        const major = (a % 30 === 0);
        const r1 = major ? 35 : 39.5, r2 = 43, rad = a * Math.PI / 180;
        ticks += '<line x1="' + (50 + r1 * Math.sin(rad)).toFixed(1) + '" y1="' + (50 - r1 * Math.cos(rad)).toFixed(1) +
            '" x2="' + (50 + r2 * Math.sin(rad)).toFixed(1) + '" y2="' + (50 - r2 * Math.cos(rad)).toFixed(1) +
            '" stroke="#d8d4bf" stroke-width="' + (major ? 2 : 1) + '"/>';
    }
    return '<svg class="sv-dsvg" viewBox="0 0 100 100"><defs>' +
        '<linearGradient id="svBz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4d6d3"/><stop offset=".45" stop-color="#7c7f7e"/><stop offset="1" stop-color="#26282a"/></linearGradient>' +
        '<radialGradient id="svFace" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1b1c1d"/><stop offset="1" stop-color="#040404"/></radialGradient>' +
        '<linearGradient id="svGl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
        '<circle cx="50" cy="50" r="49" fill="url(#svBz)"/><circle cx="50" cy="50" r="45.5" fill="#050505"/><circle cx="50" cy="50" r="44.5" fill="url(#svFace)"/>' + ticks +
        '<path d="M50 30 L54 46 L66 54 L66 58 L53 54 L53 66 L58 70 L58 73 L50 71 L42 73 L42 70 L47 66 L47 54 L34 58 L34 54 L46 46Z" fill="#d8d4bf"/>' +
        '<g data-k="needle"><path d="M50 4 L43.5 19 L56.5 19Z" fill="#e39a1a" stroke="#4a2d00" stroke-width=".6"/>' +
        '<line x1="50" y1="19" x2="50" y2="30" stroke="#e39a1a" stroke-width="2.5"/></g>' +
        '<ellipse cx="38" cy="29" rx="30" ry="16" transform="rotate(-28 50 50)" fill="url(#svGl)"/>' +
        '<circle cx="50" cy="50" r="44.5" fill="none" stroke="#000" stroke-opacity=".65" stroke-width="1.6"/></svg>';
}

// Realistyczny przelacznik dzwigienkowy (typu TV1 / TP1): podkladka z zabkiem, nakretka szesciokatna,
// tulejka z gwintem, chromowana dzwignia z zaokraglonym koncem i cieniem. Trzy polozenia: up / mid / down.
function apToggleSvg(id) {
    const u = "tg" + id;
    const f = (v) => v.toFixed(2);
    const cx = 15, cy = 36;
    // nakretka szesciokatna
    let hex = "", hexHi = "";
    for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + i * Math.PI / 3;
        hex += (i ? " L" : "M") + f(cx + 8.4 * Math.cos(a)) + " " + f(cy + 8.4 * Math.sin(a));
    }
    hex += "Z";
    const pt = (i) => [f(cx + 8.4 * Math.cos(Math.PI / 6 + i * Math.PI / 3)), f(cy + 8.4 * Math.sin(Math.PI / 6 + i * Math.PI / 3))];
    hexHi = "M" + pt(2).join(" ") + " L" + pt(3).join(" ") + " L" + pt(4).join(" ");        // krawedzie od strony swiatla
    const hexLo = "M" + pt(5).join(" ") + " L" + pt(0).join(" ") + " L" + pt(1).join(" ");  // krawedzie w cieniu
    // dzwignia: dir -1 = do gory, +1 = w dol
    const bat = (dir) => {
        const y1 = cy + dir * 28, hb = 2.8, ht = 3.7;
        const body = "M" + f(cx - hb) + " " + cy + " L" + f(cx - ht) + " " + y1 + " L" + f(cx + ht) + " " + y1 + " L" + f(cx + hb) + " " + cy + "Z";
        const sx = 2.6, sy = dir < 0 ? 2.8 : 4.6;
        const sh = (w, o) => '<path d="M' + f(cx - hb - w + sx) + " " + f(cy + sy * .35) + " L" + f(cx - ht - w + sx) + " " + f(y1 + sy) + " L" + f(cx + ht + w + sx) + " " + f(y1 + sy) +
            " L" + f(cx + hb + w + sx) + " " + f(cy + sy * .35) + 'Z" fill="#000" fill-opacity="' + o + '"/>' +
            '<ellipse cx="' + f(cx + sx) + '" cy="' + f(y1 + sy) + '" rx="' + f(4.1 + w) + '" ry="' + f(2.9 + w) + '" fill="#000" fill-opacity="' + o + '"/>';
        return '<g class="p-' + (dir < 0 ? "up" : "down") + '">' + sh(1.6, .14) + sh(.7, .2) + sh(0, .22) +
            '<path d="' + body + '" fill="url(#' + u + 'c)" stroke="#141516" stroke-width=".35"/>' +
            '<path d="M' + f(cx - 0.7) + " " + f(cy + dir * 2) + " L" + f(cx - 1.2) + " " + f(y1 - dir * 2) + '" stroke="#fff" stroke-opacity=".75" stroke-width=".8" stroke-linecap="round"/>' +
            '<ellipse cx="' + cx + '" cy="' + f(cy + dir * .6) + '" rx="3.3" ry="1.4" fill="#111213"/>' +
            '<ellipse cx="' + cx + '" cy="' + f(y1) + '" rx="4.1" ry="2.8" fill="url(#' + u + 't)" stroke="#1a1b1c" stroke-width=".35"/>' +
            '<ellipse cx="' + f(cx - 1.2) + '" cy="' + f(y1 - .8) + '" rx="1.1" ry=".6" fill="#fff" fill-opacity=".9"/></g>';
    };
    const mid = '<g class="p-mid"><circle cx="' + (cx + 2.4) + '" cy="' + (cy + 2.8) + '" r="6.4" fill="#000" fill-opacity=".18"/>' +
        '<circle cx="' + (cx + 2) + '" cy="' + (cy + 2.3) + '" r="5" fill="#000" fill-opacity=".3"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="4.9" fill="url(#' + u + 't)" stroke="#1a1b1c" stroke-width=".4"/>' +
        '<ellipse cx="' + (cx - 1.4) + '" cy="' + (cy - 1.5) + '" rx="1.3" ry=".8" fill="#fff" fill-opacity=".9"/></g>';
    return '<svg viewBox="0 0 30 70" class="an-tg"><defs>' +
        '<linearGradient id="' + u + 'c" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b2e30"/><stop offset=".16" stop-color="#7f8284"/>' +
        '<stop offset=".33" stop-color="#eef0ed"/><stop offset=".44" stop-color="#ffffff"/><stop offset=".58" stop-color="#b6b8b7"/>' +
        '<stop offset=".8" stop-color="#5d6062"/><stop offset=".92" stop-color="#8a8d8e"/><stop offset="1" stop-color="#2a2c2e"/></linearGradient>' +
        '<radialGradient id="' + u + 't" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".22" stop-color="#e9ebe8"/>' +
        '<stop offset=".58" stop-color="#959897"/><stop offset="1" stop-color="#3a3d3f"/></radialGradient>' +
        '<linearGradient id="' + u + 'n" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c4c6c4"/><stop offset=".45" stop-color="#7a7d7f"/><stop offset="1" stop-color="#2a2c2e"/></linearGradient>' +
        '<radialGradient id="' + u + 'w" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#8e9193"/><stop offset=".7" stop-color="#56595b"/><stop offset="1" stop-color="#25272a"/></radialGradient>' +
        '<radialGradient id="' + u + 's" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
        '</defs>' +
        '<ellipse cx="' + (cx + 2.5) + '" cy="' + (cy + 3.5) + '" rx="15" ry="14" fill="url(#' + u + 's)"/>' +
        '<path d="M' + (cx - 2) + ' ' + (cy + 10) + ' h4 v4.2 h-4z" fill="url(#' + u + 'w)" stroke="#0e0f10" stroke-width=".5"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="11.6" fill="url(#' + u + 'w)" stroke="#0e0f10" stroke-width=".7"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="10.6" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width=".6"/>' +
        '<path d="' + hex + '" fill="url(#' + u + 'n)" stroke="#151617" stroke-width=".6"/>' +
        '<path d="' + hexHi + '" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".6"/>' +
        '<path d="' + hexLo + '" fill="none" stroke="#000" stroke-opacity=".5" stroke-width=".6"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="4.7" fill="#3b3e40" stroke="#a9abaa" stroke-width=".5"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="3.9" fill="none" stroke="#151617" stroke-width=".5"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="3.1" fill="none" stroke="#6b6e70" stroke-width=".35"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="2.5" fill="#0b0c0d"/>' +
        bat(-1) + bat(1) + mid + '</svg>';
}

// Wiersz nawigacji radiowej (oba wyglady): zrodlo NVU, czestotliwosc, OBS, KUR / radial
function apRadioRowHTML(rocks) {
    const L = AP_LABELS;
    const col = (ctr, cap) => '<div class="sv-navcol"><div class="sv-ctr" data-k="' + ctr + '"></div><div class="sv-ncap" data-k="' + ctr + 'Cap">' + apRu(cap) + '</div></div>';
    return '<div class="sv-row sv-navrow"><div class="sv-group sv-radio"><span class="sv-glabel">' + apRu(L.radioGroup) + '</span>' +
        '<div class="sv-srcsel" data-k="srcbtn"><div class="sv-tf sv-tf3" data-k="srcLever" data-pos="up">' + apToggleSvg("src") + '</div>' +
        '<span class="sv-sl sv-sl1">' + apRu(L.srcNames.RTE) + '</span><span class="sv-sl sv-sl2">' + apRu(L.srcNames.ADF) + '</span><span class="sv-sl sv-sl3">' +
        apRu(L.srcNames.VOR) + '</span><span class="sv-slcap">' + apRu(L.srcCap) + '</span></div>' +
        col("freqCounter", L.freq) + rocks("freqinc", "freqdec") +
        col("obsCounter", L.obs) + rocks("obsinc", "obsdec") +
        '<div class="sv-tfcol"><div class="sv-tf" data-k="tfsw" data-pos="up">' + apToggleSvg("tfsw") + '</div>' +
        '<span class="sv-tfl sv-tfa">' + apRu(L.toFrom[0]) + '</span><span class="sv-tfl sv-tfb">' + apRu(L.toFrom[1]) + '</span></div>' +
        col("kurCounter", L.kur) + '</div></div>';
}

function apAnnHTML() {
    const L = AP_LABELS;
    return '<div class="sv-anns"><div class="sv-ann sv-grn" data-k="annYd">' + apRu(L.lampYd) + '</div><div class="sv-ann" data-k="annDanger">' + apRu(L.lampDanger) + '</div><div class="sv-ann sv-amb" data-k="annAlt">' + apRu(L.lampAlt) +
        '</div><div class="sv-ann" data-k="annRoll">' + apRu(L.lampRoll) + '</div><div class="sv-ann" data-k="annPitch">' + apRu(L.lampPitch) + '</div></div>';
}

// Replika pulpitu AP-28L1 (lewa strona) + nastawniki obok (prawa strona)
function apAn28HTML(vem) {
    const L = AP_LABELS, N = AP_LABELS.an;
    const T = (txt, x, y, size, w) => '<div class="an-t' + (w ? ' an-c' : '') + '" style="left:' + x + 'px;top:' + y + 'px;font-size:' + size + 'px;' +
        (w ? 'width:' + w + 'px;' : '') + '">' + apRu(txt) + '</div>';
    const lever = (k, x, y, pos) => '<div class="an-lv" data-k="' + k + '" data-pos="' + pos + '" style="left:' + x + 'px;top:' + y + 'px">' + apToggleSvg(k) + '</div>';
    const hit = (k, x, y, w, h) => '<div class="an-hit" data-k="' + k + '" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px"></div>';
    const lamp = (k, cls, x, y) => '<div class="an-lamp ' + cls + '" data-k="' + k + '" style="left:' + x + 'px;top:' + y + 'px"></div>';
    const screw = (x, y, r) => '<i class="sv-screw" style="left:' + x + 'px;top:' + y + 'px;transform:rotate(' + r + 'deg)"></i>';

    // gorny blok: lampki, galka RAZVOROT
    // galka: wyrenderowany bakelit (oswietlenie, odbicia, cien) + obracany bialy wskaznik i napis na kapturku
    const kf = (v) => v.toFixed(1);
    const knobBase = '<i class="kn-img kn-base"></i>';
    const knobRot = '<div class="kn-lift" style="transform:translateY(-3.4px)"><div class="kn-rot" data-k="knobRot">' +
        '<svg class="kn-l" viewBox="0 0 150 150"><rect x="73.3" y="11" width="3.4" height="13" rx="1.5" fill="#ecebe2" fill-opacity=".93"/></svg></div></div>' +
        '<div class="kn-lift" style="transform:translateY(-8.7px)"><div class="kn-rot" data-k="knobRot2"><div class="an-klabel">' + apRu(N.turn) + '</div></div></div>';
    const knobGloss = '<i class="kn-img kn-spec"></i>';
    // znaczniki skrajnych polozen przy literach L i P (na panelu)
    const tick = (deg) => {
        const r = deg * Math.PI / 180, cx = 170, cy = 127;
        return '<line x1="' + kf(cx + 79 * Math.sin(r)) + '" y1="' + kf(cy - 79 * Math.cos(r)) + '" x2="' + kf(cx + 89 * Math.sin(r)) +
            '" y2="' + kf(cy - 89 * Math.cos(r)) + '" stroke="#e6e3d6" stroke-opacity=".9" stroke-width="2.6" stroke-linecap="round"/>';
    };
    const knobMarks = '<svg class="an-kmarks" viewBox="0 0 338 266">' + tick(-128) + tick(128) + '</svg>';
    const top = '<div class="an-top an-blk">' +
        T(N.title, 0, 12, 22, 340) +
        lamp("lampReady", "an-amber", 22, 40) + T(N.ready, 8, 96, 10, 74) +
        lamp("lampOn", "an-green", 272, 40) + T(N.on, 252, 96, 10, 86) +
        knobMarks + '<div class="an-knob">' + knobBase + knobRot + knobGloss + '</div>' +
        '<i class="an-idx"></i>' +
        T(N.left, 92, 200, 18) + T(N.right, 236, 200, 18) +
        hit("knobL", 95, 52, 75, 150) + hit("knobR", 170, 52, 75, 150) +
        '</div>';

    // boczne przelaczniki SPUSK / PODYEM (samopowrotne)
    const side = (x, kUp, kDn, kLv) => '<div class="an-sw an-blk" style="left:' + x + 'px">' +
        T(N.descent, 0, 12, 10, 62) + lever(kLv, 16, 56, "mid") + T(N.climb, 0, 158, 10, 62) +
        hit(kDn, 0, 0, 62, 92) + hit(kUp, 0, 92, 62, 92) + '</div>';

    // dolny blok
    const cols = [0, 93, 186, 279, 372];
    let low = '<div class="an-low an-blk">' +
        screw(4, 4, 20) + screw(449, 4, 55) + screw(4, 285, 75) + screw(449, 285, 35);
    for (let i = 1; i < 5; i++) low += '<i class="an-sep" style="left:' + cols[i] + 'px;top:6px;height:150px"></i>' +
        '<i class="an-guard" style="left:' + (cols[i] - 3) + 'px;top:24px;height:126px"></i>';
    low += '<i class="an-hsep" style="top:164px"></i>';
    low += T(N.autotrim, 0, 10, 12, 93) + T(N.power, 93, 10, 12, 93) + T(N.engage, 186, 10, 12, 93) + T(N.stab, 279, 10, 12, 93) + T(N.pitch, 372, 10, 12, 93);
    low += T(N.enabled, 0, 44, 9, 93) + lever("swAuto", 32, 62, "up") + T(N.disabled, 0, 140, 9, 93);
    low += T(N.enabled, 93, 44, 9, 93) + lever("swPower", 125, 62, "down") + T(N.disabled, 93, 140, 9, 93);
    low += T(N.ap, 186, 36, 24, 93) + '<div class="an-rbtn an-lens" data-k="btnEngage" style="left:205px;top:76px"></div>';
    low += T(N.gik, 290, 42, 11) + T(N.gpk, 290, 82, 11) + T(N.turns, 290, 126, 9) + lever("swGsw", 342, 50, "up") +
        hit("gswGIK", 279, 30, 93, 36) + hit("gswGPK", 279, 70, 93, 36) + hit("gswTURN", 279, 112, 93, 36);
    low += T(N.enabled, 372, 44, 9, 93) + lever("swPitch", 404, 62, "up") + T(N.disabled, 372, 140, 9, 93);
    low += T(N.horizon, 186, 178, 11, 93) + '<div class="an-rbtn" data-k="btnHorizon" style="left:205px;top:202px"></div>';
    low += '<div class="an-lamp an-amber an-dome" data-k="domeFwd" style="left:24px;top:196px"></div>' + T(N.fwd, 0, 256, 10, 93);
    low += '<div class="an-lamp an-amber an-dome" data-k="domeBack" style="left:117px;top:196px"></div>' + T(N.back, 93, 256, 10, 93);
    low += lamp("lampKV", "an-green", 303, 196) + '<div class="an-rbtn" data-k="btnKV" style="left:391px;top:202px"></div>' + T(N.kv, 279, 258, 15, 186);
    low += '</div>';

    // prawa strona: nastawniki, trasa, wyswietlacz
    const triV = (up) => '<svg viewBox="0 0 10 10"><path d="' + (up ? "M1 8 L5 2 L9 8Z" : "M1 2 L5 8 L9 2Z") + '"/></svg>';
    const rocks = (inc, dec) => '<div class="sv-rocks"><div class="sv-rock" data-k="' + inc + '">' + triV(true) + '</div><div class="sv-rock" data-k="' + dec + '">' + triV(false) + '</div></div>';
    const group = (label, ctr, inc, dec) => '<div class="sv-group"><span class="sv-glabel" data-k="' + ctr + 'Cap">' + apRu(label) + '</span><div class="sv-ctr" data-k="' + ctr + '"></div>' + rocks(inc, dec) + '</div>';
    const navcol = (ctr, cap) => '<div class="sv-navcol"><div class="sv-ctr" data-k="' + ctr + '"></div><div class="sv-ncap">' + apRu(cap) + '</div></div>';
    const sidepl = '<div class="an-sidepl an-blk">' +
        '<i class="sv-screw sv-tl"></i><i class="sv-screw sv-tr"></i><i class="sv-screw sv-bl"></i><i class="sv-screw sv-br"></i>' +
        '<div class="sv-title"><span>' + apRu(N.sideTitle) + '</span>' + apAnnHTML() + '</div>' +
        (vem ? '<div class="an-vblk"><div class="an-vleft">' + apVemBox(176) + '<div class="sv-group sv-dial">' + apDialSvg() + '</div></div><div class="an-vright">' +
            group(N.zk, "zkCounter", "zkinc", "zkdec") + group(L.altGroup, "altCounter", "altinc", "altdec") + group(L.vsGroup, "vsCounter", "vsinc", "vsdec") + '</div></div>'
        : '<div class="sv-row"><div class="sv-group sv-dial">' + apDialSvg() + '</div>' + group(N.zk, "zkCounter", "zkinc", "zkdec") + '</div>' +
          '<div class="sv-row">' + group(L.altGroup, "altCounter", "altinc", "altdec") + group(L.vsGroup, "vsCounter", "vsinc", "vsdec") + '</div>') +
        '<div class="sv-row sv-navrow"><div class="sv-group sv-nav"><span class="sv-glabel">' + apRu(L.navGroup) + '</span>' +
        navcol("wpCounter", L.wp) + rocks("wpinc", "wpdec") + navcol("distCounter", L.dist) + navcol("xtkCounter", L.xtk) +
        '<div class="sv-btn" data-k="loadroute">' + apRu(L.load) + '</div></div></div>' + apRadioRowHTML(rocks) +
        '<div class="sv-bottom"><div class="sv-status" data-k="status"></div></div>' +
        '<div class="an-foot"><div class="sv-btn" data-k="btnCws">' + apRu(N.cws) + '</div><div class="sv-btn" data-k="btnOff">' + apRu(N.off) +
        '</div><div class="sv-btn" data-k="ydbtn">' + apRu(L.yd) + '</div><div class="sv-btn" data-k="vembtn" style="flex:.8">' + apRu(L.vem) + '</div></div>' +
        '<div class="an-foot an-foot2"><div class="sv-btn" data-k="btnCtl" style="flex:2.2"></div><div class="sv-btn" data-k="atbtn" style="flex:.8">' + apRu(L.at) + '</div><div class="sv-btn" data-k="unitbtn"></div><div class="sv-btn" data-k="btnSkin" style="flex:.8">' + apRu("\u0412\u0418\u0414") + '</div></div>' +
        '<textarea class="sv-debug" data-k="debug" readonly></textarea></div>';

    return '<div class="sv-root an-root"><style>' + AP_SKIN_CSS + AP_AN_CSS + AP_VEM_CSS + '</style><div class="sv-body"><div class="an-wrap">' +
        '<div class="an-pulpit">' + top + side(2, "clUpL", "clDnL", "lvL") + side(416, "clUpR", "clDnR", "lvR") + low + '</div>' + sidepl +
        '</div></div></div>';
}


// ---------------------------------------------------------------------
//  Wysokosciomierz VEM-72 (rysowany wektorowo; 1 obrot wskazowki = 1000 m albo 1000 ft)
// ---------------------------------------------------------------------
const AP_VEM_SIZE = 240;

// napis z wektorowych liter wewnatrz SVG (os x: srodek / lewa krawedz, y: linia bazowa)
function apSvgText(txt, x, y, size, fill, anchor, track) {
    let w = 0, out = "";
    const tr = (track || 0) * 1000 / size;
    for (const ch of String(txt)) {
        const g = AP_GLYPHS[ch];
        if (!g) { w += 330 + tr; continue; }
        out += '<path transform="translate(' + w + ' 0)" d="' + g[1] + '"/>';
        w += g[0] + tr;
    }
    w -= tr;
    const s = size / 1000, x0 = (anchor === "start") ? x : x - w * s / 2;
    return '<g transform="translate(' + x0.toFixed(2) + ' ' + y.toFixed(2) + ') scale(' + s.toFixed(4) + ')" fill="' + fill + '">' + out + '</g>';
}

// polozenie bebenkow licznika: [x, szerokosc, rozmiar cyfry, mnoznik] (mnoznik 0 = staly bebenek "0")
const AP_VEM_CTOP = 135, AP_VEM_CH = 22;    // gorna krawedz i wysokosc bebenkow licznika
function apVemCells(metric) {
    // od prawej: jednostki (staly "0"), dziesiatki, setki, tysiace, (dziesiatki tysiecy w stopach)
    const spec = metric ? [[15, 11, 0], [18, 13, 10], [21, 18, 100], [22, 18, 1000]]
        : [[15, 11, 0], [17, 13, 10], [19, 17, 100], [19, 17, 1000], [19, 17, 10000]];
    const gap = 2, total = spec.reduce((s, c) => s + c[0], 0) + gap * (spec.length - 1);
    let x = 120 + total / 2;
    return spec.map((c) => { x -= c[0]; const r = [Math.round(x), c[0], c[1], c[2]]; x -= gap; return r; });
}

const AP_VEM_CSS = `
.vem-box{position:relative;flex:none;border-radius:9px}
.vem-box > .vem{position:absolute;left:0;top:0;transform-origin:0 0}
.sv-vembot{align-items:flex-start;gap:12px;margin-top:4px}
.sv-vcol{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;height:196px}
.sv-vcol .sv-status{flex:1;margin:4px}
.sv-vbtns{display:flex;gap:8px}
.sv-vbtns .sv-mini{flex:1 1 0;height:38px;margin:0;font-size:11px}
.sv-vbtns .sv-mini[data-k="controls"]{flex:2 1 0}
.sv-vcol{gap:8px}
.an-vblk{display:flex;gap:12px;margin-bottom:14px}
.an-vleft{flex:0 0 176px;display:flex;flex-direction:column;align-items:center;gap:14px}
.an-vleft .sv-dial{flex:none;width:88px;height:92px}
.an-vright{flex:1;min-width:0;display:flex;flex-direction:column;gap:14px}
.an-vright .sv-group{flex:none;height:78px}
.an-vright .sv-group:first-child{height:92px}
.vem{position:relative;width:${AP_VEM_SIZE}px;height:${AP_VEM_SIZE}px;border-radius:9px;border:1px solid #000;
 background:#111213;
 box-shadow:0 0 0 1px rgba(0,0,0,.9),0 6px 12px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.14),inset 0 -2px 3px rgba(0,0,0,.6)}
.vem > svg,.vem-cells{position:absolute;left:0;top:0;width:${AP_VEM_SIZE}px;height:${AP_VEM_SIZE}px}
.vem-top{pointer-events:none}
.vem-cell{position:absolute;overflow:hidden;color:#ebe8dc;text-align:center;
 background:linear-gradient(#050505 0%,#1d1e1f 30%,#262728 50%,#1d1e1f 70%,#050505 100%)}
.vem-cell::after{content:"";position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;
 background:linear-gradient(rgba(0,0,0,.85) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 70%,rgba(0,0,0,.85) 100%)}
.vem-strip{position:absolute;left:0;top:0;width:100%}
.vem-strip > div{text-align:center}
.vem-strip .sv-g{vertical-align:-.17em}
.vem-pcell{position:absolute;overflow:hidden;color:#ebe8dc;text-align:center;background:#070707}
.vem-pcell .sv-g{vertical-align:-.17em}
.vem-baro{position:absolute;cursor:ns-resize}
`;

// wnetrze przyrzadu (zalezy od jednostek)
function apVemHTML(metric) {
    const L = AP_LABELS, C = 120, F = "#e8e5d8";
    const p = (r, a) => [(C + r * Math.sin(a)).toFixed(2), (C - r * Math.cos(a)).toFixed(2)];
    let face = '<svg viewBox="0 0 240 240"><defs>' +
        '<radialGradient id="vemBz" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#3a3c3d"/><stop offset=".5" stop-color="#232425"/><stop offset="1" stop-color="#0b0c0d"/></radialGradient>' +
        '<radialGradient id="vemFace" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#121313"/><stop offset=".85" stop-color="#0e0f0f"/><stop offset="1" stop-color="#030303"/></radialGradient>' +
        '<radialGradient id="vemBr" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="#f3dc93"/><stop offset=".45" stop-color="#b48a38"/><stop offset="1" stop-color="#4f3a12"/></radialGradient>' +
        '<linearGradient id="vemCase" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#232527"/><stop offset=".45" stop-color="#161718"/><stop offset="1" stop-color="#0a0b0c"/></linearGradient>' +
        '</defs>' +
        '<rect x="0" y="0" width="240" height="240" rx="9" fill="url(#vemCase)"/>' +
        '<rect x="1" y="1" width="238" height="238" rx="8.5" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="1"/>';
    // sruby mosiezne w rogach
    [[16, 16, 30], [224, 16, 70], [16, 224, -20], [224, 224, 15]].forEach((s) => {
        face += '<g transform="translate(' + s[0] + ' ' + s[1] + ') rotate(' + s[2] + ')"><circle r="8.6" fill="#000" fill-opacity=".55" cx=".8" cy="1.3"/>' +
            '<circle r="8" fill="url(#vemBr)" stroke="#2a1d06" stroke-width=".8"/><rect x="-7" y="-1.2" width="14" height="2.4" rx=".6" fill="#2b1f08"/>' +
            '<rect x="-7" y="1.1" width="14" height=".6" fill="#f5e4a8" fill-opacity=".35"/></g>';
    });
    face += '<circle cx="120" cy="121.5" r="113" fill="#000" fill-opacity=".6"/>' +
        '<circle cx="120" cy="120" r="112" fill="url(#vemBz)"/><circle cx="120" cy="120" r="107.5" fill="#050505"/>' +
        '<circle cx="120" cy="120" r="105" fill="url(#vemFace)"/>';
    // podzialka co 20 jednostek
    for (let v = 0; v < 1000; v += 20) {
        const a = v / 1000 * 2 * Math.PI, major = v % 100 === 0, mid = v % 50 === 0;
        const r1 = major ? 85 : (mid ? 91 : 95), q1 = p(r1, a), q2 = p(101.5, a);
        face += '<line x1="' + q1[0] + '" y1="' + q1[1] + '" x2="' + q2[0] + '" y2="' + q2[1] + '" stroke="' + F + '" stroke-width="' + (major ? 3.4 : (mid ? 2.2 : 1.5)) + '"/>';
    }
    for (let i = 0; i < 10; i++) {
        if (i === 5) continue;                              // dol tarczy zaslania okienko cisnienia
        const q = p(74, i * Math.PI / 5);
        face += apSvgText(String(i), +q[0], +q[1] + 8.1, 22, F);
    }
    face += apSvgText("\u00d7100 " + (metric ? L.vemMetr : L.vemFt), 121, 79, 9.5, F, "middle", 0.4) +
        apSvgText(L.vemAlt, 120, 95, 11, F, "middle", 0.7) +
        apSvgText(L.vemType, 120, 173, 7.5, "#8a877c", "middle", 0.4);
    // okienko licznika
    const cells = apVemCells(metric), left = cells[cells.length - 1][0] - 3, right = cells[0][0] + cells[0][1] + 3;
    face += '<rect x="' + left + '" y="' + (AP_VEM_CTOP - 3) + '" width="' + (right - left) + '" height="' + (AP_VEM_CH + 6) + '" rx="1.5" fill="#000" stroke="' + F + '" stroke-width="1.5"/>';
    // okienko cisnienia z indeksem
    const n = metric ? 3 : 4, pw = 14, px = 120 - n * pw / 2;
    face += apSvgText(metric ? L.vemMm : L.vemHpa, 120, 186, 9, F, "middle", 0.5) +
        '<rect x="' + (px - 2) + '" y="190" width="' + (n * pw + 4) + '" height="19" fill="#000" stroke="' + F + '" stroke-width="1.2"/>' +
        '<line x1="' + (px - 9) + '" y1="190" x2="' + (px - 2) + '" y2="190" stroke="' + F + '" stroke-width="1.2"/>' +
        '<line x1="' + (px - 9) + '" y1="207" x2="' + (px - 2) + '" y2="207" stroke="' + F + '" stroke-width="1.2"/>' +
        '<line x1="' + (px + n * pw + 2) + '" y1="190" x2="' + (px + n * pw + 9) + '" y2="190" stroke="' + F + '" stroke-width="1.2"/>' +
        '<line x1="' + (px + n * pw + 2) + '" y1="207" x2="' + (px + n * pw + 9) + '" y2="207" stroke="' + F + '" stroke-width="1.2"/>' +
        '<path d="M' + (px + n * pw + 5) + ' 198 L' + (px + n * pw + 12) + ' 194 L' + (px + n * pw + 12) + ' 202Z" fill="' + F + '"/>';
    face += '</svg>';

    // bebenki licznika (HTML, przesuwane w pionie)
    let html = '<div class="vem-cells">';
    cells.forEach((c, i) => {
        const h = AP_VEM_CH, fs = c[2];
        let strip = "";
        for (let d = 0; d <= 10; d++) strip += '<div style="height:' + h + 'px;line-height:' + h + 'px">' + apRu(String(d % 10)) + '</div>';
        html += '<div class="vem-cell" style="left:' + c[0] + 'px;top:' + AP_VEM_CTOP + 'px;width:' + c[1] + 'px;height:' + h + 'px;font-size:' + fs + 'px">' +
            '<div class="vem-strip" data-vem="d' + i + '"' + (c[3] ? '' : ' style="transform:translateY(0px)"') + '>' + strip + '</div></div>';
    });
    for (let i = 0; i < n; i++)
        html += '<div class="vem-pcell" data-vem="p' + i + '" style="left:' + (px + i * pw) + 'px;top:191.5px;width:' + (pw - 1) + 'px;height:16px;line-height:16px;font-size:13px"></div>';
    html += '<div class="vem-baro" data-vem="baro" style="left:' + (px - 16) + 'px;top:176px;width:' + (n * pw + 32) + 'px;height:34px"></div></div>';

    // wskazowka, piasta, szklo
    const top = '<svg class="vem-top" viewBox="0 0 240 240"><defs>' +
        '<linearGradient id="vemGl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".035"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
        '<g data-vem="needle"><path d="M121.4 158 L118.6 158 L117.6 120 L118.3 64 L120 24 L121.7 64 L122.4 120Z" fill="#000" fill-opacity=".45" transform="translate(1.6 2.2)"/>' +
        '<path d="M121.4 158 L118.6 158 L117.6 120 L118.3 64 L120 24 L121.7 64 L122.4 120Z" fill="#e4e1d6"/>' +
        '<path d="M120 24 L121.7 64 L122.4 120 L121.4 158 L120 158Z" fill="#b9b6aa" fill-opacity=".3"/></g>' +
        '<circle cx="121" cy="121.6" r="7" fill="#000" fill-opacity=".5"/><circle cx="120" cy="120" r="6.6" fill="#141414" stroke="#3b3b3b" stroke-width="1"/>' +
        '<circle cx="120" cy="120" r="2" fill="#5a5a58"/>' +
        '<ellipse cx="100" cy="74" rx="70" ry="34" transform="rotate(-30 120 120)" fill="url(#vemGl)"/>' +
        '<circle cx="120" cy="120" r="105" fill="none" stroke="#000" stroke-opacity=".7" stroke-width="3"/></svg>';
    return face + html + top;
}

// ---------------------------------------------------------------------
//  Panel
// ---------------------------------------------------------------------
// gdzie dziala ten egzemplarz panelu: "toolbar" (okno z paska narzedzi) albo "efb" (aplikacja na tablecie EFB)
const AP_HOST = "toolbar";
// klasa bazowa: TemplateElement z MSFS, a gdyby go nie bylo (np. w EFB) - zwykly HTMLElement
const AP28_BASE = (typeof TemplateElement !== "undefined") ? TemplateElement : class extends HTMLElement { connectedCallback() { } };

class AP28Panel extends AP28_BASE {
    constructor() {
        super(...arguments);
        this.started = false;
        this.skinOn = false;
        this.skinRoot = null;
        this.host = null;
        this._scale = 0;
        this._initTries = 0;
        this._initRetry = null;

        // czym AP porusza: trymery lotek i windy / same stery / trymer steru kierunku + trymer windy
        this.controlModes = [{ key: "trim" }, { key: "surf" }, { key: "rtrim" }];
        this.controlModeIndex = 0;
        try {
            const saved = parseInt(window.localStorage.getItem(AP_CONFIG.storagePrefix + "controlMode"), 10);
            if (saved >= 0 && saved < this.controlModes.length) this.controlModeIndex = saved;
        } catch (e) { }

        // stan autopilota
        this.apOn = false;
        this.latMode = "OFF";   // OFF | LVL | HDG
        this.vertMode = "OFF";  // OFF | LVL | ALT
        this.hdgTarget = 0;
        this.altTarget = 0;
        this.vsTarget = 0;
        this.vemOn = AP_CONFIG.showAltimeter !== false;   // wysokosciomierz VEM-72 obok panelu
        try { const vs = window.localStorage.getItem(AP_CONFIG.storagePrefix + "vem"); if (vs === "0" || vs === "1") this.vemOn = vs === "1"; } catch (e) { }
        this.altMetric = false;                        // wyswietlanie wysokosci: false = stopy, true = metry
        try { this.altMetric = window.localStorage.getItem(AP_CONFIG.storagePrefix + "altunit") === "m"; } catch (e) { }
        this.altPlace = 100;                           // krok strzalek / kolka = wybrana cyfra licznika (1, 10, 100, 1000, 10000)
        this.route = { src: "", pts: [], idx: 0 };     // trasa: zrodlo, punkty, indeks punktu docelowego
        this.skinKind = "";
        this.zk2 = 0;                                  // kurs z zadajnika ZK-2 (pulpit AP-28L1)
        this.bankTarget = 0;                           // zadany przechyl (galka RAZVOROT)
        this.cws = false;                              // "sovmeshchennoe upravlenie": reczne przejecie sterow
        this.drive = { roll: true, pitch: true };      // ktore osie AP faktycznie steruje
        this.an = { pwr: false, ready: false, readyAt: 0, knob: 0, gsw: "GIK", pitchCh: true, kv: false,
            hLock: false, hLvl: false, hOkSince: 0, climb: 0, trimSince: 0, lampFwd: false, lampBack: false };
        this.anEl = {};
        this.navSrc = "RTE";                           // zrodlo NVU: RTE (trasa EFB), ADF (ARK / NDB), VOR
        try { const ns = window.localStorage.getItem(AP_CONFIG.storagePrefix + "navsrc"); if (ns === "RTE" || ns === "ADF" || ns === "VOR") this.navSrc = ns; } catch (e) { }
        this.disc = { roll: false, pitch: false, since: 0, t: {} };   // lampki automatycznego odlaczenia
        this.alr = { danger: false, dSince: 0, dAck: false, alt: null, aSince: 0, aAck: false, cap: false, tgt: null };   // sygnalizacja wysokosci
        this.dangerH = AP_CONFIG.alert.dangerHeightM;   // prog OPASN. VYS. [m]
        try { const dh = parseFloat(window.localStorage.getItem(AP_CONFIG.storagePrefix + "dangerH")); if (dh >= 10 && dh <= 750) this.dangerH = dh; } catch (e) { }
        try { const ao = window.localStorage.getItem(AP_CONFIG.storagePrefix + "atovr"); if (ao === "0" || ao === "1") AP_CONFIG.at.pilotOverride = ao === "1"; } catch (e) { }
        this._lockId = 1 + Math.floor(Math.random() * 999998);   // numer tego egzemplarza (blokada toolbar / EFB)
        this.ydOn = false;                              // tlumik odchylenia
        try { this.ydOn = window.localStorage.getItem(AP_CONFIG.storagePrefix + "yd") === "1"; } catch (e) { }
        this.ydSign = AP_CONFIG.yd.sign >= 0 ? 1 : -1;
        try { const ys = window.localStorage.getItem(AP_CONFIG.storagePrefix + "ydSign"); if (ys === "1" || ys === "-1") this.ydSign = +ys; } catch (e) { }
        this.ydPID = new ApPID(AP_CONFIG.yd);
        this.atOn = false; this.atTarget = 0;           // AT: automat ciagu
        this.atPID = new ApPID(AP_CONFIG.at);
        this._at = { t: null, thr: 0, base: 0, ovr: 0 };
        this.vorFreq = 113.9; this.vorObs = 0;          // wlasny odbiornik VOR
        try {
            const vf = parseFloat(window.localStorage.getItem(AP_CONFIG.storagePrefix + "vorfreq")); if (vf >= 108 && vf <= 117.95) this.vorFreq = vf;
            const vo = parseFloat(window.localStorage.getItem(AP_CONFIG.storagePrefix + "vorobs")); if (vo >= 0 && vo < 360) this.vorObs = vo;
        } catch (e) { }
        this._vor = { st: new Map(), sess: null, busy: false, next: 0, best: null, apSess: null, ilsNext: 0, ilsDone: new Set() };
        this._yd = { active: false, base: 0, t: null, bad: 0, sampleT: 0, sampleB: 0 };
        this._adf = { ahead: 0, lastQdm: null };
        this.navDir = "TO";                            // przelacznik NA (TO) / OT (FROM) dla ARK i VOR
        try { if (window.localStorage.getItem(AP_CONFIG.storagePrefix + "navdir") === "FROM") this.navDir = "FROM"; } catch (e) { }
        this.adfCrs = 0;                               // ZPU dla ARK "OT" (od radiolatarni)
        this._vorSide = null; this._vorObs = null;
        this._lastNavCmd = null;
        this._noSigT = 0;
        this.radioEl = null;
        this._radioPend = null;
        this._routeLoading = false;
        this._fpListener = null;
        this._prListener = null;
        this._navInfo = { dist: 0, xtk: 0, dtk: 0, crsMag: 0, cmdTrack: 0 };
        this.cmdBank = 0;       // aktualne (wygladzone) zadanie przechylu [deg, prawy = +]
        this.cmdVS = 0;         // aktualne (wygladzone) zadanie VS [fpm]
        this.bankPID = new ApPID(AP_CONFIG.bank);
        this.vsPID = new ApPID(AP_CONFIG.vs);
        this.out = { aileron: 0, elevator: 0 };
        this.cur = { bank: 0, vs: 0, hdg: 0, alt: 0, onGround: false };
        this._targetsInit = false;
        this._lastTime = null;
        this._notice = "";
        this._noticeUntil = 0;

        // debug
        this.debugEnabled = false;
        this._dbgTick = 0;

        this.initialize();
    }

    connectedCallback() {
        super.connectedCallback();
        this.initialize();
    }

    // ----- inicjalizacja -----
    initialize() {
        if (this.started) return;
        try {
            this.host = this.querySelector("#ap28-root");
            if (this.host && !this.scaleWrap) {
                this.scaleWrap = document.createElement("div");
                this.scaleWrap.className = "ap28-scale";
                this.host.appendChild(this.scaleWrap);
                try { window.addEventListener("resize", () => this._fitSkin()); } catch (e) { }
            }
            if (!this.host) {
                // szablon okna jeszcze nie wstawiony - sprobuj ponownie za chwile
                if (this._initTries++ < 50 && !this._initRetry) {
                    this._initRetry = setTimeout(() => { this._initRetry = null; this.initialize(); }, 200);
                }
                return;
            }
            this.version = "AP-28 v1.16.0";
            this._buildSkin();
            if (this.skinOn) {
                if (this.skinKind !== "an28") this._initListeners();
                this._initDebugToggle();
            } else {
                this.host.innerHTML = '<div style="color:#f98;padding:12px;font:13px monospace">AP-28: panel build error</div>';
            }
            this._initRouteApi();
            setInterval(() => this.controlLoop(), AP_CONFIG.loopMs);
            setInterval(() => this.updateUI(), 250);
            setInterval(() => this._fitSkin(), 100);
            setInterval(() => { try { this._vemTick(); } catch (e) { } }, 50);
            setInterval(() => { try { this._linkTick(); } catch (e) { } }, 50);
            this.started = true;
            this.updateUI();
        } catch (e) {
            this.log("Error in initialize: " + e, "ERROR");
        }
    }

    // wyglad: zapamietany wybor albo AP_CONFIG.skin
    _wantedKind() {
        let k = (AP_CONFIG.skin === "an28") ? "an28" : "sov";
        try {
            const s = window.localStorage.getItem(AP_CONFIG.storagePrefix + "skin");
            if (s === "sov" || s === "an28") k = s;
        } catch (e) { }
        return k;
    }

    // przelacza wyglad: kabina radziecka <-> pulpit AP-28L1 (wybor jest zapamietywany)
    _switchSkin() {
        const next = (this.skinKind === "an28") ? "sov" : "an28";
        try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "skin", next); } catch (e) { }
        const A = this.an;
        if (next === "sov") {                                   // wychodzimy z pulpitu AP-28L1: sprzatamy jego stany
            this.drive = { roll: true, pitch: true };
            this.cws = false; A.climb = 0;
            if (this.apOn && this.latMode === "BANK") { this.latMode = "HDG"; try { this.readStates(); } catch (e) { } this.setHdgTarget(this.cur.hdg); }
        } else if (this.apOn) {                                 // wchodzimy z wlaczonym AP: pulpit ma to pokazac
            A.pwr = true; A.ready = true; A.knob = 0;
            A.gsw = (this.latMode === "NAV") ? "GPK" : "GIK";
        }
        const old = this.skinRoot;
        if (old && old.parentElement) old.parentElement.removeChild(old);
        this.skinRoot = null;
        this.vemEl = null;
        this.skinOn = false;
        this.skinKind = "";
        this._buildSkin(next);
        if (this.skinOn) {
            if (this.skinKind !== "an28") this._initListeners();
            this._initDebugToggle();
            if (this.debugEnabled && this.txtDebugLog) this.txtDebugLog.style.display = "block";
            this._scale = 0;
        }
        this.updateUI();
    }

    _buildSkin(forceKind) {
        try {
            const kind = forceKind || this._wantedKind();
            const holder = document.createElement("div");
            holder.innerHTML = (kind === "an28") ? apAn28HTML(this.vemOn) : apSkinHTML(this.vemOn);
            const root = holder.firstElementChild;
            this._vemMount(root);
            if (kind === "an28") {
                this.scaleWrap.appendChild(root);
                this.skinRoot = root;
                this._an28Mount(root);
                this.skinKind = "an28";
                this.skinOn = true;
                return;
            }
            const k = (name) => root.querySelector('[data-k="' + name + '"]');
            const refs = {
                ap: k("ap"), lvl: k("lvl"), hdg: k("hdg"), alt: k("alt"), vs: k("vs"), vsCounter: k("vsCounter"), vsinc: k("vsinc"), vsdec: k("vsdec"),
                nav: k("nav"), at: k("at"), wpCounter: k("wpCounter"), distCounter: k("distCounter"), crsCounter: k("crsCounter"),
                xtkCounter: k("xtkCounter"), wpinc: k("wpinc"), wpdec: k("wpdec"), loadroute: k("loadroute"),
                hdgCounter: k("hdgCounter"), altCounter: k("altCounter"), altCounterCap: k("altCounterCap"), unitbtn: k("unitbtn"),
                hdginc: k("hdginc"), hdgdec: k("hdgdec"), altinc: k("altinc"), altdec: k("altdec"),
                status: k("status"), controls: k("controls"), debug: k("debug"), needle: k("needle"), skinbtn: k("skinbtn"),
                annRoll: k("annRoll"), annPitch: k("annPitch"), annDanger: k("annDanger"), annAlt: k("annAlt"), annYd: k("annYd"), srcbtn: k("srcbtn"), freqCounter: k("freqCounter"), freqinc: k("freqinc"), freqdec: k("freqdec"),
                obsCounter: k("obsCounter"), obsCounterCap: k("obsCounterCap"), tfsw: k("tfsw"), obsinc: k("obsinc"), obsdec: k("obsdec"), kurCounter: k("kurCounter"), kurCounterCap: k("kurCounterCap")
            };
            for (const n in refs) if (!refs[n]) throw new Error("skin element missing: " + n);
            refs.skinbtn.addEventListener("click", () => this._switchSkin());
            this._bindRadio(refs);
            this._bindAlt(refs.altCounter, refs.altCounterCap, refs.unitbtn);
            this._bindDial(root.querySelector(".sv-dsvg"), () => this.hdgTarget, (v) => this.setHdgTarget(v));

            this.scaleWrap.appendChild(root);
            this.skinRoot = root;
            this.btnAP = refs.ap; this.btnLVL = refs.lvl; this.btnHDG = refs.hdg; this.btnALT = refs.alt;
            this.elHdgCounter = refs.hdgCounter; this.elAltCounter = refs.altCounter; this.elNeedle = refs.needle;
            this.btnHDGinc = refs.hdginc; this.btnHDGdec = refs.hdgdec;
            this.btnALTinc = refs.altinc; this.btnALTdec = refs.altdec;
            this.btnVS = refs.vs; this.elVsCounter = refs.vsCounter; this.btnVSinc = refs.vsinc; this.btnVSdec = refs.vsdec;
            this.btnAT = refs.at;
            this.btnNAV = refs.nav; this.elWpCounter = refs.wpCounter; this.elDistCounter = refs.distCounter;
            this.elCrsCounter = refs.crsCounter; this.elXtkCounter = refs.xtkCounter;
            this.btnWPinc = refs.wpinc; this.btnWPdec = refs.wpdec; this.btnLoadRoute = refs.loadroute;
            this.apTextLabel = refs.status; this.btnControls = refs.controls;
            this.txtDebugLog = refs.debug;
            this.skinKind = "sov";
            this.skinOn = true;
        } catch (e) {
            try { console.log("AP-28 skin error: " + e); } catch (x) { }
            if (this.skinRoot && this.skinRoot.parentElement) this.skinRoot.parentElement.removeChild(this.skinRoot);
            this.skinRoot = null;
            this.skinOn = false;
        }
    }

    // ----- wysokosciomierz VEM-72 -----
    _vemMount(root) {
        this._atBtn = root.querySelector('[data-k="atbtn"]');
        if (this._atBtn) {
            this._atBtn.addEventListener("click", (ev) => this.toggleAT(ev));
            this._atBtn.addEventListener("wheel", (ev) => this.adjustSpd((ev.deltaY < 0 ? 1 : -1) * (ev.shiftKey ? 10 : 1)));
        }
        this._ydBtn = root.querySelector('[data-k="ydbtn"]');
        if (this._ydBtn) this._ydBtn.addEventListener("click", () => this.toggleYd());
        const btn = root.querySelector('[data-k="vembtn"]');
        if (btn) btn.addEventListener("click", () => this.toggleVem());
        const vem = root.querySelector(".vem");
        this.vemEl = vem;
        if (!vem) return;
        vem._metric = null;
        vem.addEventListener("wheel", (ev) => {
            if (!this._vemIsBaro(ev.target)) return;
            this.vemBaroStep((ev.deltaY < 0 ? 1 : -1) * (ev.shiftKey ? 10 : 1));
        });
        vem.addEventListener("click", (ev) => {
            if (this._vemIsBaro(ev.target)) this.vemBaroLocal();
        });
    }

    _vemIsBaro(el) {
        while (el && el !== this.vemEl) { if (el.getAttribute && el.getAttribute("data-vem") === "baro") return true; el = el.parentNode; }
        return false;
    }

    toggleVem() {
        this.vemOn = !this.vemOn;
        try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "vem", this.vemOn ? "1" : "0"); } catch (e) { }
        this._rebuildSkin();
    }

    // przebudowa biezacego skina (np. po wlaczeniu / wylaczeniu przyrzadu)
    _rebuildSkin() {
        const kind = this.skinKind;
        if (!kind) return;
        const old = this.skinRoot;
        if (old && old.parentElement) old.parentElement.removeChild(old);
        this.skinRoot = null;
        this.vemEl = null;
        this.skinOn = false;
        this.skinKind = "";
        this._buildSkin(kind);
        if (this.skinOn) {
            if (this.skinKind !== "an28") this._initListeners();
            this._initDebugToggle();
            if (this.debugEnabled && this.txtDebugLog) this.txtDebugLog.style.display = "block";
            this._scale = 0;
        }
        this.updateUI();
    }

    _vemIdx() { return /:2$/.test(AP_CONFIG.altSimVar || "") ? 2 : 1; }

    // kolko nad okienkiem cisnienia: +-1 mm Hg (metry) albo +-1 hPa (stopy)
    vemBaroStep(n) {
        try {
            const mb = SimVar.GetSimVarValue("KOHLSMAN SETTING MB:" + this._vemIdx(), "millibars");
            if (!isFinite(mb) || mb < 500) return;
            let nmb;
            if (this.altMetric) nmb = apSnap(Math.round(mb * 0.750062), n) / 0.750062;
            else nmb = apSnap(Math.round(mb), n);
            nmb = apClamp(nmb, 940, 1080);
            SimVar.SetSimVarValue("K:" + (this._vemIdx() === 2 ? "2:" : "") + "KOHLSMAN_SET", "number", Math.round(nmb * 16));
        } catch (e) { this.log("VEM baro: " + e, "ERROR"); }
    }

    // klik w okienko cisnienia: cisnienie lokalne (jak klawisz B)
    vemBaroLocal() {
        try { SimVar.SetSimVarValue("K:BAROMETRIC", "number", 0); } catch (e) { }
    }

    _vemTick() {
        const V = this.vemEl;
        if (!V || !this.vemOn || !this.skinOn) return;
        if (V._metric !== this.altMetric) {
            V._metric = this.altMetric;
            V.innerHTML = apVemHTML(this.altMetric);
            V._needle = V.querySelector('[data-vem="needle"]');
            V._d = []; V._p = [];
            for (let i = 0; i < 5; i++) V._d.push(V.querySelector('[data-vem="d' + i + '"]'));
            for (let i = 0; i < 4; i++) V._p.push(V.querySelector('[data-vem="p' + i + '"]'));
            V._last = {};
        }
        const g = (n, u) => { try { return SimVar.GetSimVarValue(n, u); } catch (e) { return NaN; } };
        const ft = g(AP_CONFIG.altSimVar || "INDICATED ALTITUDE", "feet");
        if (!isFinite(ft)) return;
        const v = this.altMetric ? ft * 0.3048 : ft;
        // wskazowka: 1 obrot = 1000
        const ang = (((v % 1000) + 1000) % 1000) * 0.36;
        if (V._needle && Math.abs(ang - (V._last.ang || -99)) > 0.05) {
            V._last.ang = ang;
            V._needle.setAttribute("transform", "rotate(" + ang.toFixed(2) + " 120 120)");
        }
        // bebenki: dziesiatki przewijaja sie plynnie, wyzsze przeskakuja przy przejsciu 9 -> 0
        const a = Math.max(0, v), cells = apVemCells(this.altMetric);
        let lower = 0;
        for (let i = 1; i < cells.length; i++) {
            const m = cells[i][3];
            let pos;
            if (i === 1) pos = (a / 10) % 10;
            else pos = Math.floor(a / m) % 10 + Math.max(0, lower - 9);
            lower = pos;
            const el = V._d[i];
            const y = Math.round(pos * AP_VEM_CH * 10) / 10;
            if (el && V._last["d" + i] !== y) { V._last["d" + i] = y; el.style.transform = "translateY(" + (-y) + "px)"; }
        }
        // cisnienie
        const mb = g("KOHLSMAN SETTING MB:" + this._vemIdx(), "millibars");
        if (isFinite(mb) && mb > 0) {
            const s = this.altMetric ? String(Math.round(mb * 0.750062)).padStart(3, "0") : String(Math.round(mb)).padStart(4, "0");
            if (V._last.p !== s) {
                V._last.p = s;
                for (let i = 0; i < s.length; i++) if (V._p[i]) V._p[i].innerHTML = apRu(s[i]);
            }
        }
    }

    _renderCounter(el, value, digits, dim, signed) {
        if (!el) return;
        const v = Math.round(value);
        let s = String(Math.min(signed ? Math.abs(v) : Math.max(0, v), Math.pow(10, digits) - 1)).padStart(digits, "0");
        if (signed) s = (v < 0 ? "-" : "+") + s;
        this._renderCells(el, s, dim, signed);
    }

    // rysuje licznik z gotowego napisu (cyfry, znak na poczatku, kropka)
    _renderCells(el, s, dim, signed) {
        if (!el) return;
        if (el._last !== s) {
            el._last = s;
            el.innerHTML = s.split("").map((ch, i) =>
                '<span class="sv-cell' + ((signed && i === 0) ? ' sv-sign' : '') + (ch === "." ? ' sv-dot' : '') + '">' + apRu(ch) + '</span>').join("");
        }
        if (dim) el.classList.add("sv-dim"); else el.classList.remove("sv-dim");
    }

    // dopasowanie panelu do okna (szerokosc i wysokosc), skalowanie transformacja
    _fitSkin() {
        if (!this.skinOn || !AP_CONFIG.autoScale || !this.skinRoot || !this.host || !this.scaleWrap) return;
        const root = this.skinRoot, wrap = this.scaleWrap;
        const natW = root.offsetWidth, natH = root.offsetHeight;
        const aw = this.host.clientWidth - 12;
        if (!(natW > 0) || !(natH > 0) || !(aw > 60)) return;
        // skala wg szerokosci okna (wysokosc okna idzie za zawartoscia, wiec nie moze byc podstawa skali)
        let s = apClamp(aw / natW, 0.2, 3);
        if (AP_HOST === "efb") {                        // ekran EFB ma stala wysokosc: miesc sie w calosci
            const ah = this.host.clientHeight - 12;
            if (ah > 60) s = apClamp(Math.min(s, ah / natH), 0.2, 3);
        }
        if (Math.abs(s - this._scale) < 0.004 && wrap._w === natW && wrap._h === natH) return;
        this._scale = s; wrap._w = natW; wrap._h = natH;
        root.style.transformOrigin = "0 0";
        root.style.transform = "scale(" + s.toFixed(4) + ")";
        wrap.style.width = Math.floor(natW * s) + "px";
        wrap.style.height = Math.floor(natH * s) + "px";
    }

    _initListeners() {
        const on = (el, fn) => { if (el) el.addEventListener("click", fn); };
        on(this.btnAP, () => this.onAPClicked());
        on(this.btnLVL, () => this.onLVLClicked());
        on(this.btnHDG, () => this.onHDGClicked());
        on(this.btnALT, () => this.onALTClicked());
        this._hold(this.btnHDGinc, (ev) => this.adjustHdg(ev && ev.shiftKey ? 10 : 1));
        this._hold(this.btnHDGdec, (ev) => this.adjustHdg(ev && ev.shiftKey ? -10 : -1));
        this._hold(this.btnALTinc, (ev) => this.altStep(ev && ev.shiftKey ? 10 : 1));
        this._hold(this.btnALTdec, (ev) => this.altStep(ev && ev.shiftKey ? -10 : -1));
        on(this.btnVS, () => this.onVSClicked());
        this._hold(this.btnVSinc, (ev) => this.adjustVS(ev && ev.shiftKey ? 500 : 100));
        this._hold(this.btnVSdec, (ev) => this.adjustVS(ev && ev.shiftKey ? -500 : -100));
        on(this.btnNAV, () => this.onNAVClicked());
        on(this.btnAT, (ev) => this.toggleAT(ev));
        if (this.btnAT) this.btnAT.addEventListener("wheel", (ev) => this.adjustSpd((ev.deltaY < 0 ? 1 : -1) * (ev.shiftKey ? 10 : 1)));
        on(this.btnWPinc, () => this.adjustWp(1));
        on(this.btnWPdec, () => this.adjustWp(-1));
        on(this.btnLoadRoute, () => this.loadRoute());
        on(this.btnControls, () => this.onControlsClicked());

        if (this.skinOn && this.elVsCounter) {
            this.elVsCounter.addEventListener("wheel", (ev) => {
                const step = ev.shiftKey ? 500 : 100;
                this.adjustVS(ev.deltaY < 0 ? step : -step);
            });
        }
        if (this.elHdgCounter) {
            // klik = ustaw zadany kurs na aktualny; kolko = +-1 (z Shift +-10)
            this.elHdgCounter.addEventListener("click", () => {
                try { this.readStates(); } catch (e) { }
                this.setHdgTarget(this.cur.hdg);
            });
            this.elHdgCounter.addEventListener("wheel", (ev) => {
                const step = ev.shiftKey ? 10 : 1;
                this.adjustHdg(ev.deltaY < 0 ? step : -step);
            });
        }
    }

    _initDebugToggle() {
        // przytrzymanie wyswietlacza przez ok. 1,5 s wlacza / wylacza log diagnostyczny
        if (this.txtDebugLog) this.txtDebugLog.style.display = this.debugEnabled ? "block" : "none";
        const el = this.apTextLabel;
        if (!el) return;
        let timer = null;
        const stop = () => { if (timer) { clearTimeout(timer); timer = null; } };
        el.addEventListener("mousedown", () => {
            stop();
            timer = setTimeout(() => {
                timer = null;
                this.debugEnabled = !this.debugEnabled;
                if (this.txtDebugLog) this.txtDebugLog.style.display = this.debugEnabled ? "block" : "none";
                this.log("LOG " + (this.debugEnabled ? "ON " + this.version : "OFF"));
                if (this.debugEnabled) this._logAltSources();
            }, 1500);
        });
        el.addEventListener("mouseup", stop);
        el.addEventListener("mouseleave", stop);
    }

    // Przycisk z powtarzaniem: klik = jeden krok, przytrzymanie = kolejne kroki coraz szybciej
    _hold(el, fn) {
        if (!el) return;
        let t1 = null, t2 = null;
        const stop = () => {
            if (t1) clearTimeout(t1);
            if (t2) clearTimeout(t2);
            t1 = t2 = null;
        };
        el.addEventListener("mousedown", (ev) => {
            if (ev && ev.button !== undefined && ev.button !== 0) return;
            stop();
            const e = { shiftKey: !!(ev && ev.shiftKey) };
            fn(e);
            let n = 0;
            const tick = () => {
                n++;
                fn(e);
                t2 = setTimeout(tick, n < 10 ? 110 : (n < 30 ? 60 : 30));   // przyspieszanie
            };
            t1 = setTimeout(tick, 420);
        });
        el.addEventListener("mouseup", stop);
        el.addEventListener("mouseleave", stop);
        try { window.addEventListener("mouseup", stop); } catch (e) { }
    }

    // Tarcza kursu: klik / przeciaganie ustawia kurs (samolot na srodku = biezacy kurs), kolko = +-1 (Shift +-10)
    _bindDial(svg, getBase, setTarget) {
        if (!svg) return;
        svg.style.cursor = "pointer";
        let drag = false;
        const apply = (ev) => {
            const r = svg.getBoundingClientRect();
            const dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
            if (Math.hypot(dx, dy) < r.width * 0.12) return;            // srodek tarczy: bez zmian
            const ang = Math.atan2(dx, -dy) * 180 / Math.PI;
            setTarget(apWrap360(Math.round(this.cur.hdg + ang)));
        };
        svg.addEventListener("mousedown", (ev) => { if (ev.button !== undefined && ev.button !== 0) return; drag = true; apply(ev); });
        svg.addEventListener("mousemove", (ev) => { if (drag) apply(ev); });
        const stop = () => { drag = false; };
        svg.addEventListener("mouseup", stop);
        svg.addEventListener("mouseleave", stop);
        try { window.addEventListener("mouseup", stop); } catch (e) { }
        svg.addEventListener("wheel", (ev) => {
            const step = ev.shiftKey ? 10 : 1;
            setTarget(apWrap360(Math.round(getBase() + (ev.deltaY < 0 ? step : -step))));
        });
    }

    // ----- log -----
    // czy zbierac szczegolowy log (okno logu wlaczone albo zapis do pliku przez wtyczke)
    _logOn() { return this.debugEnabled || (AP_CONFIG.fileLog && this._linkOk === true); }

    log(msg, level) {
        if (AP_CONFIG.fileLog) {                       // do pliku: wszystko, z godzina
            const d = new Date(), p2 = (n) => String(n).padStart(2, "0");
            const ts = p2(d.getHours()) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds()) + "." + String(d.getMilliseconds()).padStart(3, "0");
            if (!this._logQ) this._logQ = [];
            this._logQ.push(ts + " [" + (level || "DEBUG") + "] " + msg);
            if (this._logQ.length > 2000) this._logQ.splice(0, this._logQ.length - 2000);
        }
        if (!this.debugEnabled || !this.txtDebugLog) return;
        try { console.log(msg); } catch (e) { }
        const lines = (this.txtDebugLog.value ? this.txtDebugLog.value.split("\r\n") : []);
        lines.push("[" + (level || "DEBUG") + "] " + msg);
        while (lines.length > 80) lines.shift();
        this.txtDebugLog.value = lines.join("\r\n");
        this.txtDebugLog.scrollTop = this.txtDebugLog.scrollHeight;
    }

    // ----- odczyt stanu symulatora -----
    readStates() {
        const g = (n, u) => SimVar.GetSimVarValue(n, u);
        const c = this.cur;
        const bank = g("PLANE BANK DEGREES", "degrees");
        const vs = g("VERTICAL SPEED", "feet per minute");
        const hdg = g("PLANE HEADING DEGREES MAGNETIC", "degrees");
        const alt = g(AP_CONFIG.altSimVar || "INDICATED ALTITUDE", "feet");
        if (![bank, vs, hdg, alt].every(Number.isFinite)) throw new Error("bad SimVar values");
        c.bank = AP_CONFIG.signBank * bank;   // prawy przechyl = dodatni
        c.vs = vs;
        c.hdg = hdg;
        c.alt = alt;
        c.onGround = g("SIM ON GROUND", "Bool") > 0;
        c.pitch = -(g("PLANE PITCH DEGREES", "degrees") || 0);   // nos w gore = dodatni
        c.lat = g("PLANE LATITUDE", "degrees");
        c.lon = g("PLANE LONGITUDE", "degrees");
        c.magvar = g("MAGVAR", "degrees") || 0;
        const vx = g("VELOCITY WORLD X", "feet per second");   // na wschod
        const vz = g("VELOCITY WORLD Z", "feet per second");   // na polnoc
        c.gs = Math.sqrt(vx * vx + vz * vz) * 0.592484;        // predkosc wzgledem ziemi [kt]
        c.track = (c.gs > 15) ? apWrap360(apDeg(Math.atan2(vx, vz))) : apWrap360(g("PLANE HEADING DEGREES TRUE", "degrees"));

        if (!this._targetsInit) {            // pierwsze odczyty: cele = stan biezacy
            this.hdgTarget = apWrap360(Math.round(hdg));
            this.altTarget = Math.round(alt);
            this.zk2 = this.hdgTarget;
            this._targetsInit = true;
        }
    }

    // log: porownanie zrodel wysokosci (do ustalenia, ktore pasuje do wysokosciomierza samolotu)
    _logAltSources() {
        const g = (n, u) => { try { return SimVar.GetSimVarValue(n, u); } catch (e) { return NaN; } };
        const f = (v) => isFinite(v) ? Math.round(v) : "-";
        this.log("ALT src: IND1 " + f(g("INDICATED ALTITUDE", "feet")) + " ft, IND2 " + f(g("INDICATED ALTITUDE:2", "feet")) +
            " ft, MSL " + f(g("PLANE ALTITUDE", "feet")) + " ft, AGL " + f(g("PLANE ALT ABOVE GROUND", "feet")) +
            " ft, BARO1 " + f(g("KOHLSMAN SETTING MB:1", "millibars")) + " hPa, BARO2 " + f(g("KOHLSMAN SETTING MB:2", "millibars")) +
            " hPa, uzywane: " + (AP_CONFIG.altSimVar || "INDICATED ALTITUDE"));
    }

    _time() {
        // czas symulatora (stoi podczas pauzy); fallback: zegar systemowy
        let t = 0;
        try { t = SimVar.GetSimVarValue("E:ABSOLUTE TIME", "seconds"); } catch (e) { }
        return (t > 0) ? t : performance.now() / 1000;
    }

    // ----- glowna petla sterowania -----
    controlLoop() {
        try {
            this.readStates();
            try { this._lockTick(); } catch (e) { }
            try { this._apThrTick(); } catch (e) { }
            this._anTick();
            try { this._alertTick(); } catch (e) { }
            try { this._ydTick(); } catch (e) { this.log("YD: " + e, "ERROR"); }
            try { this._atTick(); } catch (e) { this.log("AT: " + e, "ERROR"); }
            try { this._vorTick(); } catch (e) { }
            if (!this.apOn) { this._lastTime = null; return; }

            const C = AP_CONFIG, c = this.cur;
            if (c.onGround && !C.allowOnGround) {
                this.disengage("na ziemi");
                return;
            }
            if (this.cws) { this.resetControllers(); return; }      // reczne przejecie sterow (przycisk SOVM. UPR.)
            if (this._checkDisc()) return;                          // automatyczne odlaczenie

            const now = this._time();
            if (this._lastTime === null) { this._lastTime = now; return; }
            let dt = now - this._lastTime;
            if (dt <= 0) return;                       // pauza
            this._lastTime = now;
            if (dt > 0.5) { this.resetControllers(); return; } // przerwa/lag: zacznij czysto

            // --- os boczna: kurs -> przechyl -> lotki ---
            let desiredBank = 0, bankSlew = C.bankSlewLvl;
            if (this.latMode === "HDG") {
                const hdgErr = apWrap180(this.hdgTarget - c.hdg);   // + = trzeba w prawo
                desiredBank = apClamp(hdgErr * C.hdgBankGain, -this._bankLimit(), this._bankLimit());
                bankSlew = C.bankSlewHdg;
            } else if (this.latMode === "NAV") {
                // prowadzenie po trasie: kurs zadany -> blad drogi (track) -> przechyl
                const cmd = this._navUpdate();
                if (cmd !== null && cmd !== undefined) {
                    const trkErr = apWrap180(cmd - c.track);
                    desiredBank = apClamp(trkErr * C.hdgBankGain, -this._bankLimit(), this._bankLimit());
                }
                bankSlew = C.bankSlewHdg;
            } else if (this.latMode === "BANK") {
                desiredBank = this.bankTarget;            // galka RAZVOROT: skoordynowany zakret
                bankSlew = C.bankSlewHdg;
            }
            this.cmdBank = apSlew(this.cmdBank, desiredBank, bankSlew * dt);
            const bankErr = apWrap180(this.cmdBank - c.bank);
            const aileron = this.bankPID.update(bankErr, c.bank, dt, true);

            // --- os pionowa: wysokosc -> VS -> winda ---
            let desiredVS = 0, vsSlew = C.vsSlewLvl;
            if (this.vertMode === "ALT") {
                const predicted = c.alt + (c.vs / 60) * C.altLeadSec;
                desiredVS = apClamp((this.altTarget - predicted) * C.altToVS, -C.maxAltVS, C.maxAltVS);
                vsSlew = C.vsSlewAlt;
            } else if (this.vertMode === "VS") {
                desiredVS = this.vsTarget;
                vsSlew = C.vsSlewAlt;
            }
            this.cmdVS = apSlew(this.cmdVS, desiredVS, vsSlew * dt);
            const vsErr = this.cmdVS - c.vs;
            const elevator = this.vsPID.update(vsErr, c.vs, dt, false);
            if (!this.drive.pitch) { this.vsPID.reset(); this.cmdVS = c.vs; }     // kanal TANGAZ wylaczony: nie steruj winda

            this.out.aileron = aileron;
            this.out.elevator = elevator;
            this.applyControls(aileron, elevator);

            if (this._logOn() && (++this._dbgTick % Math.round(1000 / C.loopMs)) === 0) {
                this.log("BNK " + c.bank.toFixed(1) + ">" + this.cmdBank.toFixed(1) + " ail " + aileron.toFixed(3) +
                    " | VS " + Math.round(c.vs) + ">" + Math.round(this.cmdVS) + " ele " + elevator.toFixed(3) +
                    " | ALT " + Math.round(c.alt) + "/" + this.altTarget +
                    " HDG " + Math.round(c.hdg) + "/" + this.hdgTarget +
                    (this.latMode === "NAV" ? " | NAV wp " + (this.route.idx + 1) + "/" + this.route.pts.length + " d " + this._navInfo.dist.toFixed(1) +
                        " xtk " + this._navInfo.xtk.toFixed(2) + " cmdTrk " + Math.round(this._navInfo.cmdTrack) + " trk " + Math.round(c.track) : ""));
            }
        } catch (e) {
            this.log("Error in controlLoop: " + e, "ERROR");
            this.apOn = false;
            this.latMode = "OFF";
            this.vertMode = "OFF";
        }
    }

    applyControls(aileron, elevator) {
        const C = AP_CONFIG;
        const a = apClamp(aileron * C.signAileron, -1, 1);
        const e = apClamp(elevator * C.signElevator, -1, 1);
        const mode = this.controlModes[this.controlModeIndex].key;
        const set = (name, unit, v) => SimVar.SetSimVarValue(name, unit, v);
        if (this.drive.roll) {
            if (mode === "surf") set("AILERON POSITION", "Position", a);
            else if (mode === "rtrim") set("RUDDER TRIM PCT", "Percent Over 100", a);
            else set("AILERON TRIM PCT", "Percent Over 100", a);
        }
        if (this.drive.pitch) {
            if (mode === "surf") set("ELEVATOR POSITION", "Position", e);
            else if (mode === "rtrim") set("ELEVATOR TRIM PCT", "Percent Over 100", e);
            else set("ELEVATOR TRIM POSITION", "Radians", e * C.trimElevatorRad);
        }
    }

    resetControllers() {
        this.bankPID.reset();
        this.vsPID.reset();
        this.cmdBank = this.cur.bank;   // start od stanu aktualnego - bez skoku zadania
        this.cmdVS = this.cur.vs;
        this._lastTime = null;
    }

    // ----- blokada: panel z toolbara i aplikacja w EFB nie steruja jednoczesnie -----
    // wspolne zmienne L: (widza je wszystkie okna symulatora):
    //   L:AP28_OWN   - numer egzemplarza, ktory teraz steruje (0 = nikt)
    //   L:AP28_OWN_T - czas ostatniego potwierdzenia przez wlasciciela [s]
    //   L:AP28_TB_T  - czas zycia panelu z toolbara [s] (EFB wie, czy toolbar dziala)
    _lockNow() { return (Date.now() / 1000) % 100000; }
    _lockAge(t) { let d = this._lockNow() - t; if (d < -50000) d += 100000; return d; }
    _lockRead(name) { try { return SimVar.GetSimVarValue(name, "number") || 0; } catch (e) { return 0; } }
    _lockWrite(name, v) { try { SimVar.SetSimVarValue(name, "number", v); } catch (e) { } }
    _lockMine() { return this._lockRead("L:AP28_OWN") === this._lockId; }
    // czy steruje teraz DRUGI egzemplarz (toolbar albo EFB)
    _lockOther() {
        const own = this._lockRead("L:AP28_OWN");
        if (!own || own === this._lockId) return false;
        const age = this._lockAge(this._lockRead("L:AP28_OWN_T"));
        return age > -2 && age < 1.5;
    }
    _lockTick() {
        const now = performance.now();
        if (now < (this._lockNext || 0)) return;
        this._lockNext = now + 200;
        if (AP_HOST === "toolbar") this._lockWrite("L:AP28_TB_T", this._lockNow());
        const busy = this.apOn || this.atOn || this.ydOn;
        if (!busy) { if (this._lockMine()) this._lockWrite("L:AP28_OWN", 0); return; }
        if (this._lockOther()) {                       // drugi egzemplarz byl pierwszy: ten oddaje stery
            if (this.apOn) this.disengage();
            if (this.atOn) this._atOff();
            this.ydOn = false;
            this._setNotice("lockOther", 4000);
            this.log("Blokada: steruje drugi egzemplarz panelu (toolbar / EFB)");
            this.updateUI();
            return;
        }
        this._lockWrite("L:AP28_OWN", this._lockId);
        this._lockWrite("L:AP28_OWN_T", this._lockNow());
    }
    // czy ten egzemplarz obsluguje Stream Panel: wlasciciel sterowania, a gdy nikt nie steruje - toolbar
    _linkAllowed() {
        if (this._lockMine()) return true;
        if (this._lockOther()) return false;
        if (AP_HOST === "toolbar") return true;
        const age = this._lockAge(this._lockRead("L:AP28_TB_T"));
        return !(age > -2 && age < 2);
    }

    // ----- wlaczanie / wylaczanie -----
    engage() {
        if (this.apOn) return true;
        try { this.readStates(); } catch (e) { this.log("engage: " + e, "ERROR"); return false; }
        if (this.cur.onGround && !AP_CONFIG.allowOnGround) {
            this._setNotice("NA ZIEMI");
            this.log("AP refused: on ground");
            return false;
        }
        if (this._lockOther()) {
            this._setNotice("lockOther", 4000);
            this.log("AP refused: steruje drugi egzemplarz panelu");
            return false;
        }
        // wylacz natywny AP samolotu, zeby nie walczyl z naszym
        try {
            if (SimVar.GetSimVarValue("AUTOPILOT MASTER", "Bool") > 0)
                SimVar.SetSimVarValue("K:AP_MASTER", "number", 0);
        } catch (e) { }
        this.resetControllers();
        this.apOn = true;
        this.disc.roll = false; this.disc.pitch = false; this.disc.t = {};   // wlaczenie AP gasi lampki
        this.log("AP ENGAGED");
        return true;
    }

    // AP bez \u0410\u0422: dzwignie stoja, wiec kazde ich przesuniecie od chwili wlaczenia AP to ruch pilota.
    // (Z wlaczonym \u0410\u0422 ruch pilota wykrywa \u0410\u0422 i wylacza wtedy oba.)
    _apThrTick() {
        if (!this.apOn || this.atOn || AP_CONFIG.throttleDisconnectsAP === false) { this._apThr = null; return; }
        const n = Math.max(1, AP_CONFIG.at.engines);
        const lv = [];
        for (let i = 1; i <= n; i++) lv.push((this._sv("GENERAL ENG THROTTLE LEVER POSITION:" + i, "percent") || 0) / 100);
        if (!this._apThr) { this._apThr = { base: lv }; return; }
        let dev = 0, at = 0;
        lv.forEach((l, i) => { const d = Math.abs(l - this._apThr.base[i]); if (d > dev) { dev = d; at = i; } });
        if (dev > (AP_CONFIG.throttleApDiff || 0.05)) {
            this.log("AP: pilot ruszyl przepustnica " + (at + 1) + " (" + Math.round(this._apThr.base[at] * 100) + "% -> " + Math.round(lv[at] * 100) + "%)");
            this._apThr = null;
            this.disengage(AP_LABELS.apThr);
        }
    }

    disengage(reason) {
        this.apOn = false;
        this.latMode = "OFF";
        this.vertMode = "OFF";
        this.cws = false;
        this.an.hLvl = false; this.an.hLock = false; this.an.kv = false; this.an.climb = 0;
        this.resetControllers();
        if (reason) this._setNotice(String(reason).toUpperCase());
        this.log("AP OFF" + (reason ? " (" + reason + ")" : ""));
    }

    _setNotice(text, ms) {
        this._notice = text;
        this._noticeUntil = performance.now() + (ms || 3000);
    }

    // ----- przyciski -----
    onAPClicked() {
        if (this.apOn) {
            this.disengage();
        } else if (this.engage()) {
            this.latMode = "LVL";
            this.vertMode = "LVL";
        }
        this.updateUI();
    }

    onLVLClicked() {
        // przycisk ratunkowy: zawsze wlacza AP i poziomuje we wszystkich osiach
        if (!this.engage()) { this.updateUI(); return; }
        this.latMode = "LVL";
        this.vertMode = "LVL";
        this.log("LVL");
        this.updateUI();
    }

    onHDGClicked() {
        if (!this.apOn) {
            if (!this.engage()) { this.updateUI(); return; }
            this.vertMode = "LVL";
        }
        if (this.latMode === "HDG") {
            this.latMode = "LVL";                       // HDG wylaczony -> skrzydla poziomo
        } else {
            this.latMode = "HDG";
            if (AP_CONFIG.captureHeadingOnEngage) {
                try { this.readStates(); } catch (e) { }
                this.setHdgTarget(this.cur.hdg);
            }
        }
        this.log("HDG " + this.latMode + " target " + this.hdgTarget);
        this.updateUI();
    }

    onALTClicked() {
        if (!this.apOn) {
            if (!this.engage()) { this.updateUI(); return; }
            this.latMode = "LVL";
        }
        if (this.vertMode === "ALT") {
            this.vertMode = "LVL";                      // ALT wylaczony -> lot poziomy (VS 0)
        } else {
            this.vertMode = "ALT";
            try { this.readStates(); } catch (e) { }
            this.altTarget = Math.round(this.cur.alt);  // utrzymaj obecna wysokosc
        }
        this.log("ALT " + this.vertMode + " target " + this.altTarget);
        this.updateUI();
    }

    // ----- \u041d\u0412\u0423: wczytywanie trasy i prowadzenie -----
    _initRouteApi() {
        try {
            if (typeof RegisterViewListener === "function" && typeof Coherent !== "undefined")
                this._fpListener = RegisterViewListener("JS_LISTENER_FLIGHTPLAN", () => { });
            this._facInit();
        } catch (e) { this.log("route api: " + e, "ERROR"); }
    }

    _validLL(lat, lon) {
        return isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 &&
            (Math.abs(lat) > 1e-4 || Math.abs(lon) > 1e-4);
    }

    _pushPt(pts, lat, lon) {
        lat = Number(lat); lon = Number(lon);
        if (!this._validLL(lat, lon)) return;
        const last = pts[pts.length - 1];
        if (last && apDst(last, { lat: lat, lon: lon }) < 0.05) return;     // pomijaj powtorzenia
        pts.push({ lat: lat, lon: lon });
    }

    _parseFlightPlan(d) {
        const pts = [];
        const wps = d && d.waypoints;
        if (wps && wps.length) {
            for (let i = 0; i < wps.length; i++) {
                const w = wps[i];
                const l = w && (w.lla || w);
                if (!l) continue;
                const lat = (l.lat !== undefined) ? l.lat : l.latitude;
                const lon = (l.long !== undefined) ? l.long : ((l.lon !== undefined) ? l.lon : l.longitude);
                this._pushPt(pts, lat, lon);
            }
        }
        return pts;
    }

    // --- baza nawigacyjna symulatora: wspolrzedne lotnisk, VOR, NDB i punktow trasowych ---
    _facInit() {
        if (this._facReady) return this._facReady;
        this._facPending = new Map();
        this._facReady = new Promise((resolve) => {
            if (typeof RegisterViewListener !== "function" || typeof Coherent === "undefined") { resolve(false); return; }
            let done = false;
            const ok = (v) => { if (!done) { done = true; resolve(v); } };
            try {
                this._facListener = RegisterViewListener("JS_LISTENER_FACILITY", () => {
                    const recv = (f) => this._onFacility(f);
                    ["SendAirport", "SendIntersection", "SendVor", "SendNdb"].forEach((ev) => this._facListener.on(ev, recv));
                    // wyniki szukania najblizszych stacji przychodza zdarzeniem (SEARCH_NEAREST zwraca tylko numer)
                    ["NearestSearchCompleted", "NearestSearchCompletedWithStruct"].forEach((ev) => this._facListener.on(ev, (r) => this._onNearest(r)));
                    setTimeout(() => ok(true), 300);
                }, true);
            } catch (e) { this.log("facility listener: " + e, "ERROR"); ok(false); }
            setTimeout(() => ok(true), 3000);
        });
        return this._facReady;
    }

    _icaoKey(ic) { return [ic.type, ic.region, ic.airport, ic.ident].join("|"); }

    // ----- szukanie najblizszych obiektow (MSFS 2024: wynik zdarzeniem NearestSearchCompleted) -----
    _onNearest(r) {
        if (!r) return;
        if (!this._nearPend) { this._nearPend = new Map(); this._nearEarly = new Map(); }
        const k = r.sessionId + ":" + r.searchId, cb = this._nearPend.get(k);
        if (cb) { this._nearPend.delete(k); cb(r); }
        else { this._nearEarly.set(k, r); if (this._nearEarly.size > 20) this._nearEarly.delete(this._nearEarly.keys().next().value); }
    }
    // sesja: najpierw wersja z ICAO jako struktura, a gdy gra jej nie zna - zwykla
    _nearStart(type) {
        const tmo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej("timeout"), ms))]);
        return tmo(Coherent.call("START_NEAREST_SEARCH_SESSION_WITH_STRUCT", type), 1500)
            .then((sid) => { if (typeof sid !== "number") throw "brak"; this.log("Szukanie: sesja " + sid + " (typ " + type + ", ICAO struktura)"); return sid; })
            .catch(() => Coherent.call("START_NEAREST_SEARCH_SESSION", type).then((sid) => { this.log("Szukanie: sesja " + sid + " (typ " + type + ", ICAO napis)"); return sid; }));
    }
    _nearSearch(sid, lat, lon, meters, max) {
        if (!this._nearPend) { this._nearPend = new Map(); this._nearEarly = new Map(); }
        return Coherent.call("SEARCH_NEAREST", sid, lat, lon, meters, max).then((r) => {
            if (r && typeof r === "object" && (r.added || r.removed)) return r;       // starsza wersja gry: wynik od razu
            const k = sid + ":" + r;
            const early = this._nearEarly.get(k);
            if (early) { this._nearEarly.delete(k); return early; }
            return new Promise((resolve) => {
                this._nearPend.set(k, resolve);
                setTimeout(() => { if (this._nearPend.has(k)) { this._nearPend.delete(k); resolve({ added: [], removed: [], timeout: true }); } }, 4000);
            });
        });
    }

    _onFacility(f) {
        if (f && isFinite(f.freqMHz) && this._vorStore) this._vorStore(f);
        const ic = f && f.icaoStruct;
        if (!ic) return;
        const k = this._icaoKey(ic), cb = this._facPending.get(k);
        if (cb) cb(f);
    }

    // zwraca Promise {lat, lon} albo null
    _loadFacility(ic) {
        const calls = { A: "LOAD_AIRPORT_FROM_STRUCT", V: "LOAD_VOR_FROM_STRUCT", N: "LOAD_NDB_FROM_STRUCT", W: "LOAD_INTERSECTION_FROM_STRUCT" };
        const call = ic && calls[ic.type];
        if (!call || !ic.ident) return Promise.resolve(null);
        return this._facInit().then(() => new Promise((resolve) => {
            const k = this._icaoKey(ic);
            let done = false;
            const finish = (v) => { if (!done) { done = true; this._facPending.delete(k); resolve(v); } };
            this._facPending.set(k, (f) => finish(this._validLL(f.lat, f.lon) ? { lat: f.lat, lon: f.lon } : null));
            try {
                const p = (ic.type === "A") ? Coherent.call(call, ic, 0) : Coherent.call(call, ic);
                if (p && p.then) p.then((valid) => { if (!valid) finish(null); }).catch(() => finish(null));
            } catch (e) { finish(null); }
            setTimeout(() => finish(null), 4000);
        }));
    }

    _icaoText(ic) { return ic ? (ic.type + ":" + (ic.region || "") + ":" + (ic.ident || "")) : "-"; }

    // trasa z EFB (MSFS 2024): lotnisko startu, punkty trasy, lotnisko docelowe -> lista {lat, lon}
    // pelne dane lotniska (z procedurami SID / STAR)
    _loadAirportFull(ic) {
        if (!ic || !ic.ident) return Promise.resolve(null);
        return this._facInit().then(() => new Promise((resolve) => {
            const k = this._icaoKey(ic);
            let done = false;
            const finish = (v) => { if (!done) { done = true; this._facPending.delete(k); resolve(v); } };
            this._facPending.set(k, (f) => finish(f));
            try {
                const p = Coherent.call("LOAD_AIRPORT_FROM_STRUCT", ic, 0xFFFF);
                if (p && p.then) p.then((v) => { if (v && typeof v === "object" && v.departures) finish(v); else if (!v) finish(null); }).catch(() => finish(null));
            } catch (e) { finish(null); }
            setTimeout(() => finish(null), 5000);
        }));
    }

    // ICAO punktu z odcinka procedury (struktura albo stary napis 12-znakowy)
    _legIcao(leg) {
        const s = leg && (leg.fixIcaoStruct || (typeof leg.fixIcao === "object" ? leg.fixIcao : null));
        if (s && s.ident && String(s.ident).trim()) return s;
        const str = leg && typeof leg.fixIcao === "string" ? leg.fixIcao : "";
        if (str.trim().length < 2) return null;
        return { __Type: "JS_ICAO", type: str[0], region: str.substr(1, 2).trim(), airport: str.substr(3, 4).trim(), ident: str.substr(7).trim() };
    }

    _rwyName(num, des) {
        const d = (typeof des === "number") ? ["", "L", "R", "C", "W", "A", "B"][des] || "" : String(des || "");
        return (num ? String(num).padStart(2, "0") : "") + d;
    }

    // odcinki procedury: kolejnosc dla SID (rwy -> wspolne -> wylot) albo STAR (wlot -> wspolne -> rwy)
    _procLegs(fac, listName, procName, trans, rwy, isSid) {
        const list = (fac && fac[listName]) || [];
        const want = String(procName || "").trim().toUpperCase();
        if (!want) return [];
        const proc = list.find((p) => String(p.name || "").trim().toUpperCase() === want);
        if (!proc) {
            this.log(listName + " '" + want + "' nie znaleziono; dostepne: " + list.map((p) => p.name).slice(0, 12).join(","));
            return [];
        }
        const rt = proc.runwayTransitions || [], et = proc.enRouteTransitions || [];
        let rwyLegs = [];
        if (rt.length) {
            const r = rt.find((x) => this._rwyName(x.runwayNumber, x.runwayDesignation) === rwy) || (rt.length === 1 ? rt[0] : null);
            if (r) rwyLegs = r.legs || []; else this.log(want + ": brak przejscia dla pasa " + (rwy || "?"));
        }
        const tn = String(trans || "").trim().toUpperCase();
        const e = tn ? et.find((x) => String(x.name || "").trim().toUpperCase() === tn) : null;
        const enLegs = e ? (e.legs || []) : [];
        const common = proc.commonLegs || [];
        return isSid ? rwyLegs.concat(common, enLegs) : enLegs.concat(common, rwyLegs);
    }

    _rwyFrom(v) {
        if (!v) return "";
        if (typeof v === "string") return v.replace(/^RW/i, "").trim().toUpperCase();
        return this._rwyName(v.number !== undefined ? v.number : v.runwayNumber, v.designator !== undefined ? v.designator : v.runwayDesignation);
    }

    _routeFromEfb(r) {
        const isIcao = (ic) => ic && ic.ident && String(ic.ident).trim() !== "";
        const useP = AP_CONFIG.nav.useProcedures !== false && r;
        const pick = (...names) => { for (const n of names) if (r && r[n]) return r[n]; return ""; };
        const sidName = useP ? pick("departure", "departureProcedure", "sid") : "";
        const starName = useP ? pick("arrival", "arrivalProcedure", "star") : "";
        if (r && this._logOn()) this.log("EFB pola: " + Object.keys(r).join(","));
        if (sidName || starName) this.log("EFB SID " + (sidName || "-") + " " + (pick("departureTransition") || "") + " / STAR " + (starName || "-") + " " + (pick("arrivalTransition") || ""));
        const depP = (sidName && isIcao(r.departureAirport)) ? this._loadAirportFull(r.departureAirport) : Promise.resolve(null);
        const arrP = (starName && isIcao(r.destinationAirport)) ? this._loadAirportFull(r.destinationAirport) : Promise.resolve(null);
        return Promise.all([depP, arrP]).then(([dep, arr]) => {
            const items = [];
            const legItems = (legs, tag) => {
                let n = 0;
                for (const L of legs) {
                    const ic = this._legIcao(L);
                    if (ic && ["V", "N", "W", "A"].indexOf(ic.type) >= 0) { items.push({ icao: ic, tag: tag }); n++; }
                }
                if (legs.length) this.log(tag + ": " + n + " punktow z " + legs.length + " odcinkow");
            };
            if (r && isIcao(r.departureAirport)) items.push({ icao: r.departureAirport });
            if (dep) legItems(this._procLegs(dep, "departures", sidName, pick("departureTransition"), this._rwyFrom(pick("departureRunway")), true), "SID");
            else if (sidName) this.log("SID: brak danych lotniska");
            const legs = (r && r.enroute) || [];
            for (let i = 0; i < legs.length; i++) {
                const L = legs[i];
                if (!L) continue;
                if (L.hasLatLon && this._validLL(L.lat, L.lon)) items.push({ lat: L.lat, lon: L.lon });
                else if (isIcao(L.fixIcao)) items.push({ icao: L.fixIcao });
                else this.log("EFB leg " + i + " skipped (" + (L.name || "") + ")");
            }
            if (arr) legItems(this._procLegs(arr, "arrivals", starName, pick("arrivalTransition"), this._rwyFrom(pick("destinationRunway", "arrivalRunway")), false), "STAR");
            else if (starName) this.log("STAR: brak danych lotniska");
            if (r && isIcao(r.destinationAirport)) items.push({ icao: r.destinationAirport });
            this.log("EFB route: " + items.length + " items, dep " + this._icaoText(r && r.departureAirport) + ", dest " + this._icaoText(r && r.destinationAirport));
            return Promise.all(items.map((it) => it.icao ? this._loadFacility(it.icao).then((p) => {
                if (!p) this.log("not found: " + this._icaoText(it.icao));
                return p;
            }) : Promise.resolve({ lat: it.lat, lon: it.lon })));
        }).then((list) => {
            const pts = [];
            for (const p of list) if (p) this._pushPt(pts, p.lat, p.lon);
            return pts;
        });
    }

    _extractPoints(o, pts, depth) {          // szuka par lat/lon w dowolnej strukturze (zapasowo)
        if (!o || depth > 6 || typeof o !== "object") return;
        if (o.length !== undefined) {
            for (let i = 0; i < o.length; i++) this._extractPoints(o[i], pts, depth + 1);
            return;
        }
        if (o.hasLatLon === false) return;
        const lat = (o.lat !== undefined) ? o.lat : o.latitude;
        const lon = (o.long !== undefined) ? o.long : ((o.lon !== undefined) ? o.lon : o.longitude);
        if (lat !== undefined && lon !== undefined) { this._pushPt(pts, lat, lon); return; }
        for (const k in o) { try { this._extractPoints(o[k], pts, depth + 1); } catch (e) { } }
    }

    _dump(tag, obj) {
        if (!this.debugEnabled) return;
        try { this.log(tag + ": " + JSON.stringify(obj).slice(0, 600)); } catch (e) { this.log(tag + ": (brak serializacji)"); }
    }

    // Zrodla trasy (po kolei): 1) trasa z EFB (GET_EFB_ROUTE; wspolrzedne punktow z bazy nawigacyjnej),
    // 2) plan ATC (GET_FLIGHTPLAN), 3) zmienne GPS silnika (aktywny plan, punkt docelowy)
    loadRoute(onDone) {
        if (this._routeLoading) return;
        this._routeLoading = true;
        this._setNotice("LOADING");
        const wait = AP_CONFIG.nav.loadWaitMs;
        const finish = (pts, src) => {
            this._routeLoading = false;
            this._noticeUntil = 0;
            if (pts && pts.length) {
                this.route = { src: src, pts: pts, idx: 0 };
                try { this.readStates(); } catch (e) { }
                this._selectStartIndex();
                this.log("ROUTE " + src + " n=" + pts.length + " idx=" + this.route.idx +
                    " first=" + pts[0].lat.toFixed(4) + "," + pts[0].lon.toFixed(4));
            } else {
                this.route = { src: "", pts: [], idx: 0 };
                this.log("ROUTE none");
            }
            if (onDone) onDone(this.route.pts.length > 0);
            this.updateUI();
        };
        const tryGps = () => {
            try {
                const act = SimVar.GetSimVarValue("GPS IS ACTIVE FLIGHT PLAN", "Bool") > 0;
                const lat = SimVar.GetSimVarValue("GPS WP NEXT LAT", "degrees");
                const lon = SimVar.GetSimVarValue("GPS WP NEXT LON", "degrees");
                this.log("GPS vars: active=" + act + " next=" + lat + "," + lon);
                if (act && this._validLL(lat, lon)) { finish([{ lat: lat, lon: lon }], "GPS"); return; }
            } catch (e) { }
            finish([], "");
        };
        const tryEfb = () => {
            try {
                if (typeof RegisterViewListener !== "function" || typeof Coherent === "undefined") { tryAtc(); return; }
                const ask = () => {
                    let p;
                    try { p = (this._prListener && this._prListener.call) ? this._prListener.call("GET_EFB_ROUTE") : Coherent.call("GET_EFB_ROUTE"); }
                    catch (e) { p = Coherent.call("GET_EFB_ROUTE"); }
                    p.then((r) => {
                        this._dump("GET_EFB_ROUTE", r);
                        return this._routeFromEfb(r).then((pts) => {
                            if (pts.length < 1) { const alt = []; this._extractPoints(r, alt, 0); pts = alt; }
                            if (pts.length) finish(pts, "EFB"); else tryAtc();
                        });
                    }).catch((e) => { this.log("GET_EFB_ROUTE: " + e); tryAtc(); });
                };
                if (this._prListener) ask();
                else {
                    let started = false;
                    const go = () => { if (!started) { started = true; ask(); } };
                    this._prListener = RegisterViewListener("JS_LISTENER_PLANNEDROUTE", () => setTimeout(go, 200), true);
                    setTimeout(go, 1500);
                }
            } catch (e) { this.log("EFB route: " + e); tryAtc(); }
        };
        const tryAtc = () => {
            try {
                if (typeof Coherent === "undefined") { tryGps(); return; }
                if (!this._fpListener && typeof RegisterViewListener === "function")
                    this._fpListener = RegisterViewListener("JS_LISTENER_FLIGHTPLAN", () => { });
                Coherent.call("LOAD_CURRENT_ATC_FLIGHTPLAN");
                setTimeout(() => {
                    try {
                        Coherent.call("GET_FLIGHTPLAN").then((d) => {
                            this._dump("GET_FLIGHTPLAN", d);
                            const pts = this._parseFlightPlan(d);
                            if (pts.length) finish(pts, "ATC"); else tryGps();
                        }).catch((e) => { this.log("GET_FLIGHTPLAN: " + e); tryGps(); });
                    } catch (e) { tryGps(); }
                }, wait);
            } catch (e) { this.log("ATC route: " + e); tryGps(); }
        };
        this._facInit();
        tryEfb();
    }

    // wybor punktu startowego: najblizszy punkt przed samolotem
    _selectStartIndex() {
        const R = this.route, c = this.cur, N = AP_CONFIG.nav;
        if (R.src === "GPS" || !R.pts.length) return;
        const pos = { lat: c.lat, lon: c.lon };
        let best = -1, bestD = 1e9;
        for (let i = 0; i < R.pts.length; i++) {
            const d = apDst(pos, R.pts[i]);
            if (d < N.skipNearNm && i < R.pts.length - 1) continue;
            if (Math.abs(apWrap180(apBrg(pos, R.pts[i]) - c.track)) > 100) continue;   // punkt za nami
            if (d < bestD) { bestD = d; best = i; }
        }
        R.idx = (best >= 0) ? best : R.pts.length - 1;
    }

    // zwraca kurs (track) do wyprowadzenia samolotu na trase albo null
    _navUpdate() {
        if (this.navSrc === "ADF") return this._navAdf();
        if (this.navSrc === "VOR") return this._navVor();
        const c = this.cur, N = AP_CONFIG.nav, R = this.route;
        if (!this._validLL(c.lat, c.lon)) return null;
        const pos = { lat: c.lat, lon: c.lon };
        let tgt = null, prev = null;
        if (R.src === "GPS") {
            const g = (n) => SimVar.GetSimVarValue(n, "degrees");
            tgt = { lat: g("GPS WP NEXT LAT"), lon: g("GPS WP NEXT LON") };
            if (!this._validLL(tgt.lat, tgt.lon)) return null;
            prev = { lat: g("GPS WP PREV LAT"), lon: g("GPS WP PREV LON") };
            if (!this._validLL(prev.lat, prev.lon) || apDst(prev, tgt) < 0.05) prev = null;
        } else {
            if (!R.pts.length) return null;
            // przelaczanie na kolejne punkty (z wyprzedzeniem zakretu)
            for (let guard = 0; guard < 4 && R.idx < R.pts.length; guard++) {
                const p = R.pts[R.idx];
                const last = (R.idx === R.pts.length - 1);
                const dist = apDst(pos, p);
                const brg = apBrg(pos, p);
                const legDtk = (R.idx > 0) ? apBrg(R.pts[R.idx - 1], p) : brg;
                let lead = N.seqMinNm;
                if (!last) {
                    const turn = Math.abs(apWrap180(apBrg(p, R.pts[R.idx + 1]) - legDtk));
                    const v = Math.max(c.gs, 40) * 0.5144;                           // [m/s]
                    const radius = (v * v) / (9.81 * Math.tan(apRad(N.turnBank)));    // [m]
                    lead = apClamp(radius * Math.tan(apRad(turn) / 2) / 1852, N.seqMinNm, 6);
                }
                const abeam = R.idx > 0 && dist < 4 && Math.abs(apWrap180(brg - legDtk)) > 100;
                if (dist <= lead || abeam) { R.idx++; continue; }
                break;
            }
            if (R.idx >= R.pts.length) { this._routeEnd(); return null; }
            tgt = R.pts[R.idx];
            prev = (R.idx > 0) ? R.pts[R.idx - 1] : null;
        }
        const dist = apDst(pos, tgt), brgW = apBrg(pos, tgt);
        let dtk = brgW, xtk = 0, cmd = brgW;
        if (prev) {
            dtk = apBrg(prev, tgt);
            xtk = apXtk(prev, tgt, pos);
            if (Math.abs(xtk) <= N.directToXtk)
                cmd = dtk - apClamp(xtk * N.interceptGain, -N.maxIntercept, N.maxIntercept);
        }
        this._navInfo = { dist: dist, xtk: xtk, dtk: dtk, crsMag: apWrap360(dtk - c.magvar), cmdTrack: apWrap360(cmd) };
        return cmd;
    }

    _routeEnd() {
        this.latMode = "HDG";                             // koniec trasy: trzymaj biezacy kurs
        this.hdgTarget = apWrap360(Math.round(this.cur.hdg));
        try { SimVar.SetSimVarValue("K:HEADING_BUG_SET", "degrees", this.hdgTarget); } catch (e) { }
        this._setNotice("ROUTE END");
        this.log("ROUTE END -> HDG " + this.hdgTarget);
    }

    onNAVClicked() {
        if (!this.apOn) {
            if (!this.engage()) { this.updateUI(); return; }
            this.vertMode = "LVL";
        }
        if (this.latMode === "NAV") {
            this.latMode = "LVL";
            this.updateUI();
            return;
        }
        this.latMode = "NAV";              // do czasu wczytania trasy samolot lata ze skrzydlami poziomo
        this._lastNavCmd = null; this._adf.ahead = 0;
        if (this.navSrc !== "RTE") { if (!this._radioHasSignal()) this._setNotice("noSignal"); this.updateUI(); return; }
        this.loadRoute((ok) => {
            if (!ok) {
                if (this.latMode === "NAV") this.latMode = "LVL";
                this._setNotice("NO ROUTE");
            }
        });
        this.updateUI();
    }

    adjustWp(delta) {
        const R = this.route;
        if (R.src === "GPS" || !R.pts.length) return;
        R.idx = apClamp(R.idx + delta, 0, R.pts.length - 1);
        this.log("WP -> " + (R.idx + 1) + "/" + R.pts.length);
        this.updateUI();
    }

    // ===== Pulpit AP-28L1 =====
    _bankLimit() {
        return (this.skinKind === "an28" && this.an.gsw === "TURN") ? AP_CONFIG.an.turnBank : AP_CONFIG.maxBank;
    }

    _an28Mount(root) {
        const E = {};
        const nodes = root.querySelectorAll("[data-k]");
        for (let i = 0; i < nodes.length; i++) E[nodes[i].getAttribute("data-k")] = nodes[i];
        const need = ["annRoll", "annPitch", "srcbtn", "freqCounter", "freqinc", "freqdec", "obsCounter", "obsinc", "obsdec", "kurCounter", "kurCounterCap", "status", "debug", "knobL", "knobR", "knobRot", "knobRot2", "swPower", "swAuto", "swPitch", "swGsw", "gswGIK", "gswGPK", "gswTURN",
            "btnEngage", "btnHorizon", "btnKV", "needle", "zkCounter", "altCounter", "vsCounter", "wpCounter", "distCounter", "xtkCounter",
            "btnCws", "btnOff", "btnCtl", "loadroute", "lampReady", "lampOn", "lampKV", "domeFwd", "domeBack", "lvL", "lvR",
            "btnSkin", "unitbtn", "altCounterCap", "clUpL", "clDnL", "clUpR", "clDnR", "zkinc", "zkdec", "altinc", "altdec", "vsinc", "vsdec", "wpinc", "wpdec"];
        for (const n of need) if (!E[n]) throw new Error("an28 element missing: " + n);
        this.anEl = E;
        this._bindRadio(E);
        this._bindAlt(E.altCounter, E.altCounterCap, E.unitbtn);
        this._bindDial(root.querySelector(".sv-dsvg"), () => this.zk2, (v) => this.setZk(v));
        const on = (el, ev, fn) => { if (el) el.addEventListener(ev, fn); };
        const hold = (el, down, up) => { on(el, "mousedown", down); on(el, "mouseup", up); on(el, "mouseleave", up); on(el, "touchstart", down); on(el, "touchend", up); };
        on(E.swPower, "click", () => this.anSetPower(!this.an.pwr));
        on(E.swAuto, "click", () => this.anSetAutotrim(this.controlModeIndex !== 0));
        on(E.swPitch, "click", () => this.anSetPitch(!this.an.pitchCh));
        on(E.gswGIK, "click", () => this.anSetGsw("GIK"));
        on(E.gswGPK, "click", () => this.anSetGsw("GPK"));
        on(E.gswTURN, "click", () => this.anSetGsw("TURN"));
        on(E.btnEngage, "click", () => this.anEngageBtn());
        on(E.btnHorizon, "click", () => this.anHorizon());
        on(E.btnKV, "click", () => this.anKV());
        on(E.knobL, "click", () => this.anKnob(-1));
        on(E.knobR, "click", () => this.anKnob(1));
        on(E.knobRot, "wheel", (ev) => this.anKnob(ev.deltaY < 0 ? 1 : -1));
        on(E.knobL, "wheel", (ev) => this.anKnob(ev.deltaY < 0 ? 1 : -1));
        on(E.knobR, "wheel", (ev) => this.anKnob(ev.deltaY < 0 ? 1 : -1));
        const up = () => this.anClimbRelease();
        hold(E.clUpL, () => this.anClimbPress(1), up); hold(E.clUpR, () => this.anClimbPress(1), up);
        hold(E.clDnL, () => this.anClimbPress(-1), up); hold(E.clDnR, () => this.anClimbPress(-1), up);
        hold(E.btnCws, () => this.anCws(true), () => this.anCws(false));
        on(E.btnOff, "click", () => this.anDisengageBtn());
        on(E.btnCtl, "click", () => this.onControlsClicked());
        on(E.btnSkin, "click", () => this._switchSkin());
        this._hold(E.zkinc, (ev) => this.adjustZk(ev && ev.shiftKey ? 10 : 1));
        this._hold(E.zkdec, (ev) => this.adjustZk(ev && ev.shiftKey ? -10 : -1));
        on(E.zkCounter, "wheel", (ev) => this.adjustZk((ev.deltaY < 0 ? 1 : -1) * (ev.shiftKey ? 10 : 1)));
        on(E.zkCounter, "click", () => { try { this.readStates(); } catch (e) { } this.zk2 = apWrap360(Math.round(this.cur.hdg)); this.updateUI(); });
        this._hold(E.altinc, (ev) => this.altStep(ev && ev.shiftKey ? 10 : 1));
        this._hold(E.altdec, (ev) => this.altStep(ev && ev.shiftKey ? -10 : -1));
        this._hold(E.vsinc, (ev) => this.adjustVS(ev && ev.shiftKey ? 500 : 100));
        this._hold(E.vsdec, (ev) => this.adjustVS(ev && ev.shiftKey ? -500 : -100));
        on(E.vsCounter, "wheel", (ev) => this.adjustVS((ev.deltaY < 0 ? 1 : -1) * (ev.shiftKey ? 500 : 100)));
        on(E.wpinc, "click", () => this.adjustWp(1));
        on(E.wpdec, "click", () => this.adjustWp(-1));
        on(E.loadroute, "click", () => this.loadRoute());
        this.apTextLabel = E.status;
        this.txtDebugLog = E.debug;
    }

    // --- co tick: gotowosc, koniec GORIZONT, SPUSK/PODYEM, lampki trymera ---
    _anTick() {
        if (this.skinKind !== "an28") return;
        const A = this.an, C = AP_CONFIG.an, now = performance.now();
        if (A.pwr && !A.ready && now >= A.readyAt) { A.ready = true; this.log("AN28: GOTOV"); }
        if (!this.apOn) { A.climb = 0; A.trimSince = 0; A.lampFwd = false; A.lampBack = false; return; }
        if (A.hLvl) {                                           // po GORIZONT: gdy poziomo, wlacz KV
            const ok = Math.abs(this.cur.bank) < 3 && Math.abs(this.cur.vs) < 200;
            if (!ok) A.hOkSince = 0; else if (!A.hOkSince) A.hOkSince = now;
            if (ok && now - A.hOkSince > C.horizonHoldMs) {
                A.hLvl = false;
                this.vertMode = "ALT";
                this.altTarget = Math.round(this.cur.alt);
                A.kv = true;
                this.log("AN28: KV po GORIZONT, alt=" + this.altTarget);
            }
        }
        if (A.climb !== 0 && this.vertMode === "VS" && !A.hLock && A.pitchCh && !this.cws) {
            this.vsTarget = apClamp(this.vsTarget + A.climb * C.climbRate * (AP_CONFIG.loopMs / 1000), -C.maxVS, C.maxVS);
        }
        const e = this.out.elevator;                            // winda/trymer na granicy zakresu -> lampki OT SEBYA / NA SEBYA
        if (this.drive.pitch && !this.cws && Math.abs(e) > C.trimWarnLevel) { if (!A.trimSince) A.trimSince = now; } else A.trimSince = 0;
        const warn = !!(A.trimSince && now - A.trimSince > C.trimWarnMs);
        A.lampBack = warn && e > 0;
        A.lampFwd = warn && e < 0;
    }

    _anHoldHeading() {
        try { this.readStates(); } catch (e) { }
        this.setHdgTarget(this.cur.hdg);
    }

    _anCaptureVS() {
        try { this.readStates(); } catch (e) { }
        this.vsTarget = apClamp(Math.round(this.cur.vs / 100) * 100, -AP_CONFIG.maxSelVS, AP_CONFIG.maxSelVS);
    }

    // os boczna wg polozenia galki i przelacznika GIK / GPK / RAZVOROTY
    _anApplyLateral(capture) {
        const A = this.an;
        if (A.knob !== 0) { this.latMode = "BANK"; this.bankTarget = A.knob * AP_CONFIG.an.knobStep; return; }
        if (A.gsw === "GPK") {                                  // orthodroma: prowadzenie po trasie (\u041d\u0412\u0423)
            this.latMode = "NAV";
            this._lastNavCmd = null; this._adf.ahead = 0;
            if (this.navSrc !== "RTE") { if (!this._radioHasSignal()) this._setNotice("noSignal"); return; }
            this.loadRoute((ok) => {
                if (!ok && this.latMode === "NAV") { this.latMode = "HDG"; this._anHoldHeading(); this._setNotice("NO ROUTE"); }
            });
        } else if (A.gsw === "TURN") {                          // dowrot na kurs z ZK-2
            this.latMode = "HDG";
            this.setHdgTarget(this.zk2);
        } else {                                                // GIK: trzymaj biezacy kurs
            this.latMode = "HDG";
            if (capture) this._anHoldHeading();
        }
    }

    _anCaptureModes() {                                         // jak przy wlaczeniu AP: kurs i tangaz zostaja takie jak w tej chwili
        this._anApplyLateral(true);
        if (this.an.pitchCh) { this.vertMode = "VS"; this._anCaptureVS(); } else this.vertMode = "OFF";
    }

    anSetPower(on) {
        const A = this.an;
        A.pwr = on;
        A.ready = false;
        if (on) A.readyAt = performance.now() + AP_CONFIG.an.readyDelayMs;
        else if (this.apOn) this.disengage();
        this.log("AN28: PITANIE " + (on ? "ON" : "OFF"));
        this.updateUI();
    }

    anEngageBtn() {
        const A = this.an;
        if (this.apOn) {                                        // po GORIZONT: ruchka w 0 + VKLYUCHENIE AP oddaje sterowanie ruchce i przelacznikom
            if (A.hLock) {
                if (A.knob === 0) { A.hLock = false; A.hLvl = false; A.kv = false; this._anCaptureModes(); this.log("AN28: odblokowano"); }
                else this._setNotice("KNOB");
            }
            this.updateUI();
            return;
        }
        if (!A.pwr || !A.ready) { this._setNotice("NOT READY"); this.updateUI(); return; }
        if (A.knob !== 0) { this._setNotice("KNOB"); this.updateUI(); return; }
        if (!this.engage()) { this.updateUI(); return; }
        A.hLock = false; A.hLvl = false; A.kv = false;
        this._anCaptureModes();
        this.log("AN28: AP ENGAGED");
        this.updateUI();
    }

    anDisengageBtn() {
        if (this.apOn) this.disengage();
        this.updateUI();
    }

    anKnob(delta) {
        const A = this.an;
        if (A.hLock) { this._setNotice("LOCK"); this.updateUI(); return; }
        A.knob = apClamp(A.knob + delta, -3, 3);
        if (this.apOn && !this.cws) {
            if (A.knob !== 0) { this.latMode = "BANK"; this.bankTarget = A.knob * AP_CONFIG.an.knobStep; }
            else this._anApplyLateral(true);                    // powrot do zera: trzymaj nowy kurs
        }
        this.log("AN28: RAZVOROT " + A.knob);
        this.updateUI();
    }

    anSetGsw(v) {
        const A = this.an;
        if (A.gsw === v) return;
        A.gsw = v;
        if (this.apOn && !A.hLock && A.knob === 0 && !this.cws) this._anApplyLateral(true);
        this.updateUI();
    }

    anSetPitch(on) {
        const A = this.an;
        A.pitchCh = on;
        this.drive.pitch = on;
        if (this.apOn && !this.cws) {
            if (on && !A.hLock) { this.vertMode = "VS"; A.kv = false; this._anCaptureVS(); }
            if (!on) { this.vertMode = "OFF"; A.kv = false; }
        }
        this.updateUI();
    }

    anSetAutotrim(on) {
        this.controlModeIndex = on ? 0 : 1;
        try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "controlMode", String(this.controlModeIndex)); } catch (e) { }
        this.log("AN28: AVTOTRIM " + (on ? "ON (trymery)" : "OFF (powierzchnie)"));
        this.updateUI();
    }

    anClimbPress(dir) {                                         // dir: +1 PODYEM, -1 SPUSK
        const A = this.an;
        if (!this.apOn || A.hLock || !A.pitchCh || this.cws) return;
        if (this.vertMode !== "VS") { this.vertMode = "VS"; A.kv = false; this._anCaptureVS(); }   // KV sie wylacza
        A.climb = dir;
        this.updateUI();
    }

    anClimbRelease() {
        if (this.an.climb !== 0) { this.an.climb = 0; this.updateUI(); }
    }

    anHorizon() {
        const A = this.an;
        if (!A.pwr || !(A.ready || this.apOn)) { this._setNotice("NOT READY"); this.updateUI(); return; }
        if (!this.apOn && !this.engage()) { this.updateUI(); return; }
        this.latMode = "LVL";
        this.vertMode = "LVL";
        A.hLvl = true; A.hLock = true; A.kv = false; A.hOkSince = 0; A.climb = 0;
        this.log("AN28: GORIZONT");
        this.updateUI();
    }

    anKV() {
        const A = this.an;
        if (!this.apOn || !A.pitchCh || A.hLvl || this.cws) return;
        if (this.vertMode === "ALT") { this.vertMode = "VS"; A.kv = false; this._anCaptureVS(); }
        else {
            try { this.readStates(); } catch (e) { }
            this.vertMode = "ALT"; this.altTarget = Math.round(this.cur.alt); A.kv = true;
        }
        this.log("AN28: KV " + (this.vertMode === "ALT" ? "ON " + this.altTarget : "OFF"));
        this.updateUI();
    }

    anCws(down) {
        if (down) {
            if (this.apOn && !this.cws) { this.cws = true; this.an.climb = 0; this.log("AN28: CWS ON"); }
        } else if (this.cws) {
            this.cws = false;
            this.an.kv = false;
            try { this.readStates(); } catch (e) { }
            this.resetControllers();
            if (this.apOn) this._anCaptureModes();             // po puszczeniu AP bierze nowy kurs i tangaz
            this.log("AN28: CWS OFF");
        }
        this.updateUI();
    }

    adjustZk(delta) {
        this.setZk(apSnap(this.zk2, delta));
    }

    setZk(v) {
        this.zk2 = apWrap360(Math.round(v));
        if (this.apOn && this.an.gsw === "TURN" && this.latMode === "HDG" && this.an.knob === 0 && !this.an.hLock) this.setHdgTarget(this.zk2);
        this.updateUI();
    }

    // --- odswiezanie wygladu pulpitu ---
    _updateAn28() {
        const E = this.anEl, A = this.an, N = AP_LABELS.an;
        if (!E.status) return;
        const act = (el, on) => { if (!el) return; if (on) el.setAttribute("activated", "true"); else el.removeAttribute("activated"); };
        const ready = A.pwr && A.ready;
        act(E.lampReady, ready && (!this.apOn || this.cws));
        act(E.lampOn, this.apOn && !this.cws);
        act(E.lampKV, this.apOn && this.vertMode === "ALT");
        act(E.domeFwd, A.lampFwd);
        act(E.domeBack, A.lampBack);
        act(E.btnEngage, ready && !this.apOn);
        E.swPower.setAttribute("data-pos", A.pwr ? "up" : "down");
        E.swAuto.setAttribute("data-pos", this.controlModeIndex === 0 ? "up" : "down");
        E.swPitch.setAttribute("data-pos", A.pitchCh ? "up" : "down");
        E.swGsw.setAttribute("data-pos", A.gsw === "GIK" ? "up" : (A.gsw === "GPK" ? "mid" : "down"));
        const lv = A.climb === 1 ? "down" : (A.climb === -1 ? "up" : "mid");
        E.lvL.setAttribute("data-pos", lv);
        E.lvR.setAttribute("data-pos", lv);
        const kAng = "rotate(" + (A.knob * 360 / 44 * 2).toFixed(2) + "deg)";     // 2 rowki na polozenie: rowki zostaja na miejscu
        E.knobRot.style.transform = kAng;
        E.knobRot2.style.transform = kAng;
        E.needle.setAttribute("transform", "rotate(" + apWrap180(this.zk2 - this.cur.hdg).toFixed(1) + " 50 50)");

        const turnOn = this.apOn && A.gsw === "TURN";
        this._renderCounter(E.zkCounter, this.zk2 % 360, 3, !turnOn, false);
        const altMode = this.apOn && this.vertMode === "ALT";
        this._renderCounter(E.altCounter, this._altDisp(altMode ? this.altTarget : this.cur.alt), 5, !altMode);
        this._altUiExtra(E.altCounter, E.altCounterCap, E.unitbtn);
        const vsMode = this.apOn && this.vertMode === "VS";
        this._renderCounter(E.vsCounter, vsMode ? this.vsTarget : Math.round(this.cur.vs / 10) * 10, 4, !vsMode, true);
        const navOn = this.apOn && this.latMode === "NAV" && this.navSrc === "RTE" && this.route.pts.length > 0;
        const ni = this._navInfo;
        this._renderCounter(E.wpCounter, this.route.pts.length ? this.route.idx + 1 : 0, 2, !navOn);
        this._renderCounter(E.distCounter, navOn ? ni.dist : 0, 3, !navOn);
        const xv = navOn ? ni.xtk : 0;
        this._renderCells(E.xtkCounter, (xv < 0 ? "-" : "+") + Math.min(9.9, Math.abs(xv)).toFixed(1), !navOn, true);
        E.btnCtl.innerHTML = apRu(AP_LABELS.ctl + " \u00b7 " + AP_LABELS.ctlModes[this.controlModeIndex]);
        E.btnCws.style.filter = this.cws ? "brightness(1.6)" : "";
        this._updateRadioUI();
        this._updateDiscLamps();
        this._updateTextAn28();
    }

    _updateTextAn28() {
        const A = this.an, N = AP_LABELS.an, L = AP_LABELS;
        const pad2 = (n) => String(n).padStart(2, "0");
        const pad3 = (n) => String(Math.round(n) % 360).padStart(3, "0");
        let l1, l2 = "";
        if (!A.pwr) l1 = N.pwrOff;
        else if (!A.ready) l1 = N.warm + " " + Math.max(0, Math.ceil((A.readyAt - performance.now()) / 1000));
        else if (!this.apOn) l1 = N.ready;
        else if (this.cws) l1 = N.cwsTxt;
        else {
            let lat;
            if (this.latMode === "BANK") lat = N.bank + " " + (A.knob < 0 ? "-" : "+") + Math.abs(A.knob * AP_CONFIG.an.knobStep);
            else if (this.latMode === "NAV") lat = (this.navSrc === "RTE") ? N.shGpk : L.srcNames[this.navSrc];
            else if (this.latMode === "HDG") lat = (A.gsw === "TURN") ? N.shTurn : N.shGik;
            else lat = N.shLvl;
            const vert = (this.vertMode === "ALT") ? N.shKv : (this.vertMode === "VS" ? N.shPitch : (this.vertMode === "LVL" ? N.shLvl : "---"));
            l1 = N.on + "  " + lat + "  " + vert;
            if (this.latMode === "HDG") l2 += L.shortHdg + " " + pad3(this.hdgTarget) + "   ";
            if (this.latMode === "NAV") l2 += this._navText() + "   ";
            if (this.vertMode === "ALT") l2 += N.shKv + " " + this._altStr();
            if (this.vertMode === "VS") l2 += L.shortVs + " " + (this.vsTarget >= 0 ? "+" : "-") + Math.abs(this.vsTarget);
        }
        if (performance.now() < this._noticeUntil) {
            const map = { "NA ZIEMI": L.ground, "NO ROUTE": L.noRoute, "ROUTE END": L.routeEnd, "LOADING": L.loading,
                "NOT READY": N.notReady, "KNOB": N.knob, "LOCK": N.lock };
            l2 = map[this._notice] || L[this._notice] || this._notice;
        }
        if (this.atOn && performance.now() >= this._noticeUntil) l2 = this._atStr() + "   " + l2;
        if (!l2) l2 = " ";
        this.apTextLabel.innerHTML = apRu(l1) + "<br>" + apRu(l2);
    }

    // ===== Automatyczne odlaczenie AP (lampki KURS-KREN / TANGAZ) =====
    _checkDisc() {
        const D = AP_CONFIG.disc, c = this.cur, now = performance.now(), T = this.disc.t;
        const g = (n, u) => { try { return SimVar.GetSimVarValue(n, u); } catch (e) { return 0; } };
        const over = (key, cond, ms) => {
            if (!cond) { T[key] = 0; return false; }
            if (!T[key]) T[key] = now;
            return now - T[key] >= ms;
        };
        const trims = this.controlModes[this.controlModeIndex].key !== "surf";   // przy sterowaniu powierzchniami wolant porusza AP
        const bank = over("bank", this.drive.roll && Math.abs(c.bank) > D.maxBank, D.holdMs);
        const pitch = over("pitch", this.drive.pitch && (c.pitch > D.maxPitchUp || c.pitch < -D.maxPitchDn), D.holdMs);
        const stall = over("stall", D.stall && g("STALL WARNING", "Bool") > 0, 300);
        const ovsp = over("ovsp", D.overspeed && g("OVERSPEED WARNING", "Bool") > 0, 500);
        const yx = over("yx", D.yoke && trims && this.drive.roll && Math.abs(g("YOKE X POSITION", "Position")) > D.yokeLevel, D.yokeMs);
        const yy = over("yy", D.yoke && trims && this.drive.pitch && Math.abs(g("YOKE Y POSITION", "Position")) > D.yokeLevel, D.yokeMs);
        if (bank) return this._trip("roll", "discRoll");
        if (yx) return this._trip("roll", "discYoke");
        if (stall) return this._trip("pitch", "discStall");
        if (ovsp) return this._trip("pitch", "discOver");
        if (pitch) return this._trip("pitch", "discPitch");
        if (yy) return this._trip("pitch", "discYoke");
        return false;
    }

    _trip(kind, why) {
        this.disengage();
        this.disc.roll = (kind === "roll");
        this.disc.pitch = (kind === "pitch");
        this.disc.since = performance.now();
        this.disc.t = {};
        this._setNotice(why, 9000);
        this.log("AUTO DISC: " + why + " bank=" + this.cur.bank.toFixed(1) + " pitch=" + (this.cur.pitch || 0).toFixed(1));
        this.updateUI();
        return true;
    }

    clearDiscLamps() {
        this.disc.roll = false; this.disc.pitch = false;
        this.updateUI();
    }

    // przycisk VOR: lot po radiale VOR (wlacza AP, jesli trzeba); drugi klik - skrzydla poziomo
    onVORClicked() { this._onRadioNav("VOR"); }
    onADFClicked() { this._onRadioNav("ADF"); }
    _onRadioNav(src) {
        if (this.apOn && this.latMode === "NAV" && this.navSrc === src) { this.latMode = "LVL"; this.updateUI(); return; }
        this.navSrc = src;
        try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "navsrc", src); } catch (e) { }
        this._lastNavCmd = null; this._adf.ahead = 0; this._vorSide = null;
        if (this.skinKind === "an28") {
            if (this.apOn) { if (this.an.gsw === "GPK") this._anApplyLateral(true); else this.anSetGsw("GPK"); }
            this.updateUI();
            return;
        }
        if (!this.apOn) {
            if (!this.engage()) { this.updateUI(); return; }
            this.vertMode = "LVL";
        }
        this.latMode = "NAV";
        if (!this._radioHasSignal()) this._setNotice(src === "VOR" && !this._vor.best ? "vorNone" : "noSignal");
        this.log("NAV " + src);
        this.updateUI();
    }

    // ===== wlasny odbiornik VOR (samolot nie musi miec radia NAV) =====
    _vorVirtual() { return (AP_CONFIG.radio.vorMode || "virtual") !== "sim"; }

    _vorSetFreq(f) {
        this.vorFreq = Math.round(f * 100) / 100;
        try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "vorfreq", String(this.vorFreq)); } catch (e) { }
        this._vor.best = null; this._vor.next = 0;          // szukaj stacji od razu
    }

    _vorSetObs(o) {
        o = apWrap360(Math.round(o));
        if (this._vorVirtual()) {
            this.vorObs = o;
            try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "vorobs", String(o)); } catch (e) { }
        } else {
            try { SimVar.SetSimVarValue("K:VOR1_SET", "number", o); } catch (e) { }
            this._radioPend = { obs: o, until: performance.now() + 900 };
        }
    }

    // odczyt VOR: { has, rad (radial magnetyczny, na ktorym jest samolot), dme [NM], hasDme, obs, freq, ident }
    _vorRead() {
        if (!this._vorVirtual()) {
            const has = this._sv("NAV HAS NAV:1", "Bool") > 0, hasDme = this._sv("NAV HAS DME:1", "Bool") > 0;
            let freq = this._sv("NAV ACTIVE FREQUENCY:1", "MHz") || 0, obs = this._sv("NAV OBS:1", "degrees");
            const p = (this._radioPend && this._radioPend.until > performance.now()) ? this._radioPend : {};
            if (p.freq) freq = p.freq;
            if (isFinite(p.obs)) obs = p.obs;
            return { has: has, rad: this._sv("NAV RADIAL:1", "degrees"), dme: hasDme ? (this._sv("NAV DME:1", "nautical miles") || 0) : 0,
                hasDme: hasDme, obs: obs, freq: freq, ident: "" };
        }
        const b = this._vor.best, c = this.cur;
        const isLoc = !!(b && b.loc !== null && b.loc !== undefined);
        const out = { has: false, rad: 0, dme: 0, hasDme: false, obs: (isLoc && b.loc >= 0) ? b.loc : this.vorObs, freq: this.vorFreq,
            ident: b ? b.ident : "", loc: isLoc };
        if (!b || !this._validLL(c.lat, c.lon)) return out;
        const d = apDst(b, c);
        const horizon = 1.23 * Math.sqrt(Math.max(0, c.alt)) + 1.23 * Math.sqrt(Math.max(0, b.elevFt || 0)) + 10;
        if (d > Math.min(AP_CONFIG.radio.vorRangeNm, Math.max(25, horizon))) return out;
        out.has = true; out.hasDme = true; out.dme = d;
        out.rad = apWrap360(apBrg(b, c) - (c.magvar || 0));
        return out;
    }

    // szukanie stacji VOR o ustawionej czestotliwosci w bazie nawigacyjnej symulatora
    _vorTick() {
        if (!this._vorVirtual()) return;
        const V = this._vor, now = performance.now(), c = this.cur;
        if (V.busy || now < V.next || !this._validLL(c.lat, c.lon)) return;
        const used = this.navSrc === "VOR" || V.best === null;
        V.next = now + (used ? 5000 : 30000);
        V.busy = true;
        const done = () => { V.busy = false; this._vorPick(); if (this._logOn() && this.navSrc === "VOR") this._vorDebug(); };
        this._facInit().then(() => {
            const go = (sid) => this._nearSearch(sid, c.lat, c.lon, AP_CONFIG.radio.vorRangeNm * 1852, 120);
            const p = V.sess !== null ? Promise.resolve(V.sess) : this._nearStart(3);
            // druga sesja z filtrem "wszystkie klasy i typy" (ILS); jej bledy nie psuja zwyklego VOR
            const p2 = (V.sess2 !== undefined && V.sess2 !== null ? Promise.resolve(V.sess2) : this._nearStart(3).then((sid) => {
                try { const f = Coherent.call("SET_NEAREST_VOR_FILTER", sid, 62, 254); if (f && f.catch) f.catch(() => { }); } catch (e) { }
                return sid;
            })).then((sid) => { V.sess2 = sid; return go(sid); }).catch(() => { V.sess2 = null; return null; });
            return Promise.all([p.then((sid) => { V.sess = sid; return go(sid); }), p2]);
        }).then((rs) => {
            const seen = new Set(), added = [];
            rs.forEach((res) => ((res && res.added) || []).forEach((ic) => {
                const k = typeof ic === "string" ? ic : this._icaoKey(ic);
                if (!seen.has(k)) { seen.add(k); added.push(ic); }
            }));
            V.searches = (V.searches || 0) + 1;
            this.log("VOR: wyszukiwanie nr " + V.searches + (rs[0] && rs[0].timeout ? " (gra nie odpowiedziala)" : "") + ": nowych " + added.length + " (zwykle " + (((rs[0] || {}).added) || []).length +
                ", z ILS " + (((rs[1] || {}).added) || []).length + "), w pamieci " + V.st.size);
            const loads = added.slice(0, 120).map((ic) => this._vorLoad(ic));
            return Promise.all(loads);
        }).then(() => this._ilsScan()).then(done).catch((e) => { this.log("VOR search: " + e, "ERROR"); V.sess = null; done(); });
    }

    _vorDebug() {
        const V = this._vor, c = this.cur;
        if (!this._vorVirtual()) { this.log("VOR stan: odbiornik symulatora (radio.vorMode = " + AP_CONFIG.radio.vorMode + ")"); return; }
        const list = [];
        V.st.forEach((s) => list.push({ s: s, d: apDst(s, c) }));
        list.sort((a, b) => a.d - b.d);
        const same = list.filter((x) => Math.abs(x.s.freq - this.vorFreq) < 0.005);
        const R = this._vorRead();
        this.log("VOR stan: " + this.vorFreq.toFixed(2) + " MHz, sygnal " + (R.has ? "TAK " + R.ident + " " + Math.round(R.dme) + " NM" : "NIE") +
            ", w pamieci " + V.st.size + ", na tej czest. " + same.length + (same.length ? " (" + same[0].s.ident + " " + same[0].d.toFixed(0) + " NM)" : "") +
            ", najblizsze: " + list.slice(0, 5).map((x) => x.s.ident + " " + x.s.freq.toFixed(2) + " " + x.d.toFixed(0) + "NM").join(", "));
    }

    // czy czestotliwosc jest z pasma ILS (108.10-111.95, nieparzyste dziesiate czesci MHz)
    _isIlsFreq(f) { return f >= 108.05 && f <= 111.99 && Math.round(f * 10) % 2 === 1; }

    // ILS z lotnisk w promieniu ok. 40 NM: szukanie VOR w czesci wersji gry pomija ILS, wiec bierzemy
    // je z danych pasow lotniska (czestotliwosc ILS pasa, polozenie anteny = koniec pasa, kurs = kurs pasa)
    _ilsScan() {
        const V = this._vor, c = this.cur, now = performance.now();
        if (!this._isIlsFreq(this.vorFreq) || now < V.ilsNext) return Promise.resolve();
        let have = false;
        V.st.forEach((s) => { if (Math.abs(s.freq - this.vorFreq) < 0.005) have = true; });
        if (have) return Promise.resolve();
        V.ilsNext = now + 20000;
        const p = V.apSess !== null ? Promise.resolve(V.apSess) : this._nearStart(1);
        return p.then((sid) => { V.apSess = sid; return this._nearSearch(sid, c.lat, c.lon, 40 * 1852, 25); })
            .then((res) => {
                const added = ((res && res.added) || []).filter((ic) => {
                    const k = typeof ic === "string" ? ic : this._icaoKey(ic);
                    if (V.ilsDone.has(k)) return false;
                    V.ilsDone.add(k); return true;
                });
                if (added.length) this.log("ILS: sprawdzam " + added.length + " lotnisk");
                return Promise.all(added.slice(0, 25).map((ic) => this._loadAirportFull(typeof ic === "string" ? this._icaoFromStr(ic) : ic)
                    .then((ap) => this._ilsFromAirport(ap)).catch(() => { })));
            })
            .catch((e) => { this.log("ILS scan: " + e, "ERROR"); V.apSess = null; });
    }

    _icaoFromStr(s) {
        return { __Type: "JS_ICAO", type: s[0], region: s.substr(1, 2).trim(), airport: s.substr(3, 4).trim(), ident: s.substr(7).trim() };
    }

    _ilsFromAirport(ap) {
        if (!ap || !ap.runways) return;
        const mv = this.cur.magvar || 0;
        let n = 0;
        ap.runways.forEach((r) => {
            const len = (r.length || 0) / 1852;           // [NM]
            [[r.primaryILSFrequency, r.direction], [r.secondaryILSFrequency, (r.direction || 0) + 180]].forEach(([fq, dir]) => {
                if (!fq || !(fq.freqMHz > 107)) return;
                // antena kursowa za koncem pasa: srodek pasa + pol dlugosci w kierunku ladowania
                const end = apDest({ lat: r.latitude, lon: r.longitude }, apWrap360(dir), len / 2 + 0.16);
                const ident = String((fq.icaoStruct && fq.icaoStruct.ident) || (typeof fq.icao === "string" ? fq.icao.slice(7) : (fq.icao && fq.icao.ident)) || fq.name || "ILS").trim();
                const key = ident + "|" + fq.freqMHz.toFixed(2) + "|" + end.lat.toFixed(2);
                if (!this._vor.st.has(key)) {
                    this._vor.st.set(key, { ident: ident, freq: fq.freqMHz, lat: end.lat, lon: end.lon, loc: apWrap360(dir - mv) });
                    n++;
                }
            });
        });
        if (n) this.log("ILS: " + (ap.icaoStruct ? ap.icaoStruct.ident : "") + " - " + n + " KRM z danych pasow");
    }

    _vorLoad(ic) {
        return new Promise((resolve) => {
            let done = false;
            const fin = (f) => {
                if (done) return; done = true;
                if (f) this._vorStore(f);
                resolve();
            };
            try {
                const isStr = typeof ic === "string";
                const p = isStr ? Coherent.call("LOAD_VOR", ic) : Coherent.call("LOAD_VOR_FROM_STRUCT", ic);
                if (p && p.then) p.then((r) => { if (r && typeof r === "object" && r.freqMHz) fin(r); }).catch(() => fin(null));
            } catch (e) { fin(null); }
            setTimeout(() => fin(null), 1500);          // dane przychodza tez zdarzeniem SendVor (_onFacility)
        });
    }

    _vorStore(f) {
        if (!f || !isFinite(f.freqMHz) || !this._validLL(f.lat, f.lon)) return;
        const s = f.icaoStruct || {};
        const ident = String(s.ident || String(f.icao || "").slice(7) || "").trim();
        if (this._vor.st.size > 600) this._vor.st.clear();
        // ILS: kurs kursowej radiolatarni (KRM) jest staly - OBS go nie zmienia
        const ils = f.ils || null;
        const isLoc = f.type === 6 || f.vorClass === 4 || !!ils;
        const loc = isLoc && ils && isFinite(ils.localizerCourse) ? apWrap360(ils.localizerCourse) : (isLoc ? -1 : null);
        this._vor.st.set(ident + "|" + f.freqMHz.toFixed(2) + "|" + f.lat.toFixed(2), { ident: ident, freq: f.freqMHz, lat: f.lat, lon: f.lon, loc: loc });
    }

    _vorPick() {
        const c = this.cur, V = this._vor;
        let best = null, bd = 1e9;
        V.st.forEach((s) => {
            if (Math.abs(s.freq - this.vorFreq) > 0.005) return;
            const d = apDst(s, c);
            if (d < bd) { bd = d; best = s; }
        });
        if ((best && best.ident) !== (V.best && V.best.ident)) this.log("VOR " + this.vorFreq.toFixed(2) + ": " + (best ? best.ident +
            (best.loc !== null && best.loc !== undefined ? " (ILS/KRM, kurs " + (best.loc >= 0 ? Math.round(best.loc) : "?") + ")" : "") + " " + bd.toFixed(0) + " NM" : "brak stacji") +
            " (w pamieci " + V.st.size + " stacji)");
        V.best = best;
    }

    // ===== AT: automat ciagu (utrzymanie predkosci przyrzadowej) =====
    _ias() { return this._sv("AIRSPEED INDICATED", "knots") || 0; }
    _spdDisp(kt) { return this.altMetric ? kt * 1.852 : kt; }

    toggleAT(ev) {
        if (ev && ev.shiftKey) {                       // Shift + klik: czy ruch przepustnicy wylacza AT
            AP_CONFIG.at.pilotOverride = AP_CONFIG.at.pilotOverride === false;
            try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "atovr", AP_CONFIG.at.pilotOverride ? "1" : "0"); } catch (e) { }
            this._setNotice(AP_LABELS.atOvr + (AP_CONFIG.at.pilotOverride ? AP_LABELS.on : AP_LABELS.off), 3000);
            this.log("AT: ruch przepustnicy wylacza AT = " + AP_CONFIG.at.pilotOverride);
            this.updateUI();
            return;
        }
        if (this.atOn) { this._atOff(AP_LABELS.atOff); return; }
        if (this._lockOther()) { this._setNotice("lockOther", 4000); this.updateUI(); return; }
        if (this.cur.onGround) { this._setNotice("ground"); this.updateUI(); return; }
        const ias = this._ias();
        if (!(ias > 40)) { this._setNotice(AP_LABELS.atOff); this.updateUI(); return; }
        this.atTarget = Math.round(ias);
        this.atOn = true;
        this.atPID.reset();
        const thr = (this._sv("GENERAL ENG THROTTLE LEVER POSITION:1", "percent") || 0) / 100;
        this._at = { t: null, thr: apClamp(thr, 0, 1), base: apClamp(thr, 0, 1), w1: thr, w2: thr, acc: 0, fol: {} };
        this.log("AT ON " + this.atTarget + " kt, dzwignia " + Math.round(thr * 100) + "%");
        this.updateUI();
    }

    _atOff(msg) {
        this.atOn = false;
        if (msg) this._setNotice(msg, 4000);
        this.log("AT OFF" + (msg ? " (" + msg + ")" : ""));
        this.updateUI();
    }

    // zmiana zadanej predkosci o n krokow (1 kt albo 5 km/h)
    adjustSpd(n) {
        if (!this.atOn) return;
        let v;
        if (this.altMetric) v = apSnap(Math.round(this.atTarget * 1.852), n * 5) / 1.852;   // km/h co 5
        else v = apSnap(this.atTarget, n);
        this.atTarget = apClamp(Math.round(v * 10) / 10, 40, 400);
        this.updateUI();
    }

    _atTick() {
        if (!this.atOn) return;
        const C = AP_CONFIG.at, c = this.cur, A = this._at, now = performance.now() / 1000;
        if (c.onGround) { this._atOff(AP_LABELS.atOff); return; }
        if (A.t === null) { A.t = now; return; }
        const dt = now - A.t;
        if (dt <= 0) return;
        A.t = now;
        if (dt > 0.5) { this.atPID.reset(); return; }
        // pilot ruszyl dzwignia -> AT odlacza sie. AT co klatke wpisuje swoje ustawienie, wiec dzwignia, ktora
        // "idzie za AT", stoi tam, gdzie AT ja ostatnio (albo klatke wczesniej) postawil. Gdy nagle stoi gdzie
        // indziej - ruszyl ja pilot (os, klawisze, mysz). Dzwignie, ktore nie ida za AT, sa pomijane.
        const nEng = Math.max(1, C.engines);
        let d = 0, lever = 0;
        for (let i = 1; i <= nEng; i++) {
            const l = (this._sv("GENERAL ENG THROTTLE LEVER POSITION:" + i, "percent") || 0) / 100;
            if (i === 1) lever = l;
            const e1 = l - A.w1, e2 = l - A.w2;
            const di = Math.abs(e1) < Math.abs(e2) ? e1 : e2;
            const follows = A.fol[i] === true;             // poprzednio dzwignia byla tam, gdzie AT (1. odczyt tylko uczy)
            A.fol[i] = Math.abs(di) < 0.01;
            if (follows && Math.abs(di) > Math.abs(d)) d = di;
        }
        if (C.pilotOverride !== false) {
            if (Math.abs(d) > 0.008) A.acc += d; else A.acc *= 0.85;
            if (Math.abs(d) > C.overrideDiff || Math.abs(A.acc) > (C.overrideSum || 0.06)) {
                this.log("AT: pilot ruszyl przepustnica (dzwignia " + Math.round(lever * 100) + "%, AT " + Math.round(A.w1 * 100) + "%)");
                this._atOff(AP_LABELS.atPilot);
                if (this.apOn && AP_CONFIG.throttleDisconnectsAP !== false) this.disengage(AP_LABELS.apThr);
                return;
            }
        }
        const ias = this._ias();
        const out = this.atPID.update(this.atTarget - ias, ias, dt, false);
        let want = apClamp(A.base + out, C.minThr, C.maxThr);
        // ogranicznik silnika (\u041e\u0413\u0420): obroty / N1 / moment / smiglo blisko maksimum -> nie dodawaj, przekroczone -> cofnij
        const L = this._atEngLimit(nEng);
        A.lim = L.r > 0.995;
        let slew = C.slew;
        if (L.r > 1) { want = Math.min(want, A.thr - (L.r - 1) * 100 * ((C.limit && C.limit.gain) || 2) / 100); slew = C.slew * 2; }
        else if (L.r > 0.995) want = Math.min(want, A.thr);
        if (A.lim) {
            A.base = want - out;                       // bez narastania calki, gdy ogranicznik trzyma przepustnice
            if (!A.limLog || now - A.limLog > 10) { A.limLog = now; this.log("AT \u041e\u0413\u0420: " + L.what + " " + L.val.toFixed(1) + "% (limit " + L.lim + "%)"); }
        }
        A.thr = apClamp(apSlew(A.thr, want, slew * dt), 0, 1);
        const v = Math.round(A.thr * 16383);
        for (let i = 1; i <= nEng; i++) SimVar.SetSimVarValue("K:THROTTLE" + i + "_SET", "number", v);
        A.w2 = A.w1; A.w1 = v / 16383;                 // co AT wpisal (do wykrywania ruchu pilota)
        if (this._logOn() && (++this._atDbg || (this._atDbg = 1)) % 20 === 0)
            this.log("AT ias " + ias.toFixed(1) + "/" + this.atTarget + " thr " + Math.round(A.thr * 100) + "% lever " + Math.round(lever * 100) + "% | " + L.txt);
    }

    // najwieksze wykorzystanie limitu silnika (1.0 = na limicie) i opis do logu
    _atEngLimit(nEng) {
        const C = AP_CONFIG.at.limit || {};
        const defs = [["rpmPct", "GENERAL ENG PCT MAX RPM", "RPM"], ["n1Pct", "TURB ENG N1", "N1"],
            ["torquePct", "TURB ENG MAX TORQUE PERCENT", "TQ"], ["propPct", "PROP MAX RPM PERCENT", "PROP"]];
        const res = { r: 0, what: "", val: 0, lim: 0, txt: "" };
        const parts = [];
        defs.forEach(([key, sv, name]) => {
            const lim = C[key];
            let mx = 0;
            for (let i = 1; i <= nEng; i++) mx = Math.max(mx, this._sv(sv + ":" + i, "percent") || 0);
            parts.push(name + " " + mx.toFixed(1));
            if (!lim || !(mx > 1)) return;                 // wylaczony albo samolot tego nie podaje
            const r = mx / lim;
            if (r > res.r) { res.r = r; res.what = name; res.val = mx; res.lim = lim; }
        });
        res.txt = parts.join(" ") + (res.r > 0.995 ? " \u041e\u0413\u0420 " + res.what : "");
        return res;
    }

    _atStr() {
        return AP_LABELS.at + " " + Math.round(this._spdDisp(this.atTarget)) + " " + (this.altMetric ? AP_LABELS.kmh : AP_LABELS.kt) +
            (this._at && this._at.lim ? " " + AP_LABELS.atLim : "");
    }

    // ===== zewnetrzny panel (wtyczka Stream Panel / Stream Dock) =====
    _linkState() {
        const an = this.skinKind === "an28", ap = this.apOn, b = (v) => v ? 1 : 0;
        const altMode = ap && this.vertMode === "ALT", vsMode = ap && this.vertMode === "VS";
        const blink = performance.now() - this.disc.since < AP_CONFIG.disc.blinkMs;
        const A = this.alr;
        return Object.assign({
            v: 1, an: b(an), ap: b(ap),
            lvl: b(ap && this.latMode === "LVL" && this.vertMode === "LVL"),
            hdg: b(ap && this.latMode === "HDG"), nav: b(ap && this.latMode === "NAV"), srcW: { RTE: 0, ADF: 1, VOR: 2 }[this.navSrc] || 0, src: { RTE: 0, ADF: 1, VOR: 2 }[this.navSrc] || 0,
            vor: b(ap && this.latMode === "NAV" && this.navSrc === "VOR"), adf: b(ap && this.latMode === "NAV" && this.navSrc === "ADF"),
            at: b(this.atOn), spdT: Math.round(this._spdDisp(this.atOn ? this.atTarget : this._ias())), spdD: b(!this.atOn),
            alt: b(altMode), vs: b(vsMode), yd: b(this.ydOn && this._yd.active),
            hdgT: Math.round(an ? this.zk2 : this.hdgTarget) % 360, hdgD: 0,
            altT: Math.round(this._altDisp(altMode ? this.altTarget : this.cur.alt)), altD: b(!altMode), altM: b(this.altMetric),
            vsT: vsMode ? this.vsTarget : Math.round(this.cur.vs / 10) * 10, vsD: b(!vsMode),
            danger: A.danger ? ((A.dAck || performance.now() - A.dSince > 4000) ? 1 : 2) : 0,
            altl: A.alt === "near" ? 1 : (A.alt === "dev" ? (A.aAck ? 1 : 2) : 0),
            roll: this.disc.roll ? (blink ? 2 : 1) : 0, pitch: this.disc.pitch ? (blink ? 2 : 1) : 0,
            // odczyty na wyswietlacz zewnetrznego panelu
            hdgC: Math.round(this.cur.hdg) % 360, altC: Math.round(this._altDisp(this.cur.alt)), vsC: Math.round(this.cur.vs),
            iasC: Math.round(this._sv("AIRSPEED INDICATED", "knots") || 0),
            latW: !ap ? 0 : (this.latMode === "NAV" ? ({ RTE: 3, VOR: 4, ADF: 5 }[this.navSrc] || 3) : ({ LVL: 1, HDG: 2 }[this.latMode] || 0)),
            vertW: !ap ? 0 : ({ LVL: 1, ALT: 2, VS: 3 }[this.vertMode] || 0)
            , cmdn: this._linkCmdN || 0, gnd: this.cur && this.cur.onGround ? 1 : 0
        }, this._linkRadio(), this._linkExtra());
    }

    // radio dla Mad Doga: czestotliwosc (VOR MHz / ARK kHz), OBS albo ZPU, NA / OT, KRM
    _linkRadio() {
        const b2 = (v) => v ? 1 : 0;
        const o = { dir: this.navDir === "FROM" ? 1 : 0, frq: 0, obs: 0, loc: 0, sig: 0 };
        try { o.sig = this.navSrc === "RTE" ? b2(this.route.pts && this.route.pts.length) : b2(this._radioHasSignal()); } catch (e) { }
        try {
            if (this.navSrc === "ADF") {
                const p = (this._radioPend && this._radioPend.until > performance.now()) ? this._radioPend : {};
                o.frq = p.freq || this._sv("ADF ACTIVE FREQUENCY:1", "KHz") || 0;
                o.obs = Math.round(this.adfCrs) % 360;
            } else {
                const VR = this._vorRead();
                o.frq = VR.freq || 0; o.obs = Math.round(VR.obs || 0) % 360; o.loc = VR.loc ? 1 : 0;
            }
        } catch (e) { }
        return o;
    }

    // dodatkowe odczyty dla wyswietlacza zewnetrznego panelu (przyrzady, punkt trasy, wiatr, czas...)
    _linkExtra() {
        const c = this.cur, o = {}, r2 = (v, k) => Math.round((v || 0) * k) / k;
        const htrue = this._sv("PLANE HEADING DEGREES TRUE", "degrees");
        const ht = isFinite(htrue) ? htrue : c.hdg;
        o.pitC = r2(c.pitch, 10); o.bnkC = r2(c.bank, 10); o.gsC = Math.round(c.gs || 0);
        o.raC = Math.round(this._sv("RADIO HEIGHT", "feet") || 0); o.gnd = c.onGround ? 1 : 0; o.dngH = this.dangerH;
        const pts = this.route.pts || [], i = this.route.idx || 0, posOk = this._validLL(c.lat, c.lon);
        o.wpT = pts.length; o.wpN = pts.length ? Math.min(i + 1, pts.length) : 0; o.wpD = -1;
        let wpB = 0;
        if (pts.length && i < pts.length && posOk) { o.wpD = r2(apDst(c, pts[i]), 10); wpB = apBrg(c, pts[i]); }
        let rel = null, dist = -1;                        // igla KUR: namiar na zrodlo NVU
        if (this.navSrc === "ADF") {
            if (this._sv("ADF SIGNAL:1", "number") > 0) rel = this._sv("ADF RADIAL:1", "degrees");
        } else if (this.navSrc === "VOR") {
            const VR = this._vorRead();
            if (VR.has) { rel = VR.rad + 180 - c.hdg; dist = VR.hasDme ? VR.dme : -1; }
        } else if (o.wpD >= 0) { rel = wpB - ht; dist = o.wpD; }
        o.brgV = rel === null || !isFinite(rel) ? 0 : 1; o.brgR = o.brgV ? Math.round(apWrap360(rel)) : 0; o.brgD = r2(dist, 10);
        const wd = this._sv("AMBIENT WIND DIRECTION", "degrees") || 0;
        o.wDir = Math.round(apWrap360(wd - (c.magvar || 0))); o.wRel = Math.round(apWrap360(wd - ht));
        o.wKt = Math.round(this._sv("AMBIENT WIND VELOCITY", "knots") || 0);
        o.fuel = Math.round((this._sv("FUEL TOTAL QUANTITY WEIGHT", "pounds") || 0) * 0.45359237);
        o.oat = Math.round(this._sv("AMBIENT TEMPERATURE", "celsius") || 0);
        o.qnh = r2(this._sv("KOHLSMAN SETTING MB:1", "millibars"), 10);
        o.zulu = Math.round(this._sv("E:ZULU TIME", "seconds") || 0);
        return o;
    }

    // warianty polaczenia (gra moze blokowac niektore): po pierwszym udanym zostaje ten sam
    _linkVariants() {
        const L = AP_CONFIG.link, alt = L.url.replace("127.0.0.1", "localhost");
        return [
            { m: "xhr", post: true, url: L.url }, { m: "xhr", post: false, url: L.url },
            { m: "jsonp", post: false, url: L.url }, { m: "jsonp", post: false, url: alt },
            { m: "fetch", post: true, url: L.url }, { m: "fetch", post: false, url: L.url },
            { m: "xhr", post: true, url: alt }, { m: "xhr", post: false, url: alt },
            { m: "fetch", post: false, url: alt }
        ];
    }

    _linkTick() {
        const L = AP_CONFIG.link;
        if (!L || !L.enabled || this._linkBusy) return;
        const now = performance.now();
        if (now >= (this._linkChk || 0)) { this._linkChk = now + 500; this._linkMay = this._linkAllowed(); }
        if (!this._linkMay) {
            if (this._linkOk === true) this.log("Stream Panel: obsluguje go drugi egzemplarz panelu");
            this._linkOk = false;
            return;
        }
        if (now < (this._linkNext || 0)) return;
        const vars = this._linkVariants();
        if (this._linkVar === undefined) this._linkVar = 0;
        const V = vars[this._linkVar % vars.length];
        this._linkBusy = true;
        let done = false;
        const finish = (ok, why) => {
            if (done) return;
            done = true;
            this._linkBusy = false;
            if (ok) {
                if (this._linkOk !== true) this.log("Stream Panel: POLACZONY (" + V.m + (V.post ? " POST " : " GET ") + V.url + "), " + this.version + ", wyglad " + this.skinKind);
                this._linkOk = true;
                this._linkNext = performance.now() + (this._linkIdle ? 1000 : L.periodMs);
                return;
            }
            if (this._linkOk === true) this.log("Stream Panel: polaczenie przerwane (" + why + ")");
            this._linkOk = false;
            this._linkFails = (this._linkFails || 0) + 1;
            if (this._linkFails <= vars.length * 2)
                this.log("Stream Panel: " + V.m + (V.post ? " POST " : " GET ") + V.url + " -> " + why);
            this._linkVar = (this._linkVar + 1) % vars.length;        // nastepny wariant
            this._linkNext = performance.now() + (this._linkVar === 0 ? L.retryMs : 300);
        };
        const handle = (txt) => {
            try {
                const r = JSON.parse(txt);
                if (r.logok && logN && this._logQ) this._logQ.splice(0, logN);
                const idle = !!r.off;                      // polaczenie wylaczone klawiszem \u0421\u0412\u042f\u0417\u042c na Mad Dogu
                if (idle !== !!this._linkIdle) this.log(idle ? "Stream Panel: polaczenie wylaczone na panelu (klawisz \u0421\u0412\u042f\u0417\u042c)" : "Stream Panel: polaczenie wlaczone");
                this._linkIdle = idle;
                (r.cmds || []).forEach((c) => {
                    this._linkCmdN = (this._linkCmdN || 0) + 1;
                    try { this._linkCmd(c); } catch (e) { this.log("Stream Panel: polecenie " + c + " - blad: " + e, "ERROR"); return; }
                    this.log("Stream Panel: polecenie " + c + " -> AP " + (this.apOn ? "ON " + this.latMode + "/" + this.vertMode : "OFF") +
                        (this.cur && this.cur.onGround ? " (NA ZIEMI - AP sie nie wlacza)" : ""));
                });
                return true;
            }
            catch (e) { return false; }
        };
        const stObj = this._linkState();
        let logN = 0;
        if (AP_CONFIG.fileLog && this._logQ && this._logQ.length) {
            const maxChars = V.post ? 60000 : 1500;        // GET / JSONP: krotszy adres
            let n = 0, chars = 0;
            while (n < this._logQ.length && chars + this._logQ[n].length < maxChars) { chars += this._logQ[n].length + 4; n++; }
            if (n === 0) { this._logQ[0] = this._logQ[0].slice(0, maxChars - 50); n = 1; }
            stObj.log = this._logQ.slice(0, n);
            logN = n;
        }
        const body = JSON.stringify(stObj);
        const url = V.post ? V.url + "?t=" + Date.now() : V.url + "?s=" + encodeURIComponent(body) + "&t=" + Date.now();   // t: bez cache
        try {
            if (V.m === "jsonp") {                         // <script>: dziala nawet gdy gra nie pozwala czytac odpowiedzi XHR
                const cb = "__ap28cb" + (this._jsonpN = (this._jsonpN || 0) + 1);
                const sc = document.createElement("script");
                const clean = () => { try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (sc.parentNode) sc.parentNode.removeChild(sc); };
                const tm = setTimeout(() => { clean(); finish(false, "timeout"); }, 1500);
                window[cb] = (obj) => { clearTimeout(tm); clean(); finish(handle(JSON.stringify(obj)), "jsonp: zla odpowiedz"); };
                sc.onerror = () => { clearTimeout(tm); clean(); finish(false, "jsonp: blad ladowania"); };
                sc.src = url + "&cb=" + cb;
                (document.head || document.body || document.documentElement).appendChild(sc);
                return;
            }
            if (V.m === "fetch") {
                if (typeof fetch !== "function") { finish(false, "brak fetch"); return; }
                const tm = setTimeout(() => finish(false, "timeout"), 1500);
                fetch(url, V.post ? { method: "POST", body: body } : { method: "GET" })
                    .then((r) => r.text().then((txt) => { clearTimeout(tm); finish(handle(txt), "status " + r.status + ", odpowiedz " + (txt ? txt.length + " zn." : "pusta")); }))
                    .catch((e) => { clearTimeout(tm); finish(false, "fetch: " + e); });
                return;
            }
            const x = new XMLHttpRequest();
            x.open(V.post ? "POST" : "GET", url, true);
            x.timeout = 1500;
            // sukces = dalo sie odczytac odpowiedz (niektore wersje gry daja status 0 przy poprawnej odpowiedzi)
            x.onload = () => {
                let txt = "";
                try { txt = x.responseText || (typeof x.response === "string" ? x.response : ""); } catch (e) { txt = ""; }
                finish(handle(txt), "status " + x.status + ", odpowiedz " + (txt ? txt.length + " zn." : "pusta/nieczytelna"));
            };
            x.onerror = () => finish(false, "error, status " + x.status);
            x.ontimeout = () => finish(false, "timeout");
            if (V.post) x.send(body); else x.send();
        } catch (e) { finish(false, "wyjatek: " + e); }
    }

    // polecenie z klawisza zewnetrznego panelu
    _linkCmd(c) {
        const an = this.skinKind === "an28", A = this.an;
        switch (c) {
            case "ap":
                if (!an) this.onAPClicked();
                else if (this.apOn) this.anDisengageBtn();
                else if (!A.pwr) { this.anSetPower(true); this._setNotice(AP_LABELS.an.warm, 4000); }
                else this.anEngageBtn();
                break;
            case "lvl": if (an) this.anHorizon(); else this.onLVLClicked(); break;
            case "hdg": if (an) this.anSetGsw("GIK"); else this.onHDGClicked(); break;
            case "nav": if (an) this.anSetGsw("GPK"); else this.onNAVClicked(); break;
            case "alt": if (an) this.anKV(); else this.onALTClicked(); break;
            case "vs": if (an) { if (this.vertMode === "ALT") this.anKV(); } else this.onVSClicked(); break;
            case "yd": this.toggleYd(); break;
            case "vor": this.onVORClicked(); break;
            case "adf": this.onADFClicked(); break;
            case "src": this.cycleNavSrc(); break;
            case "tofrom": this.toggleNavDir(); break;
            case "frq+": this.adjustFreq(1, false); break;
            case "frq-": this.adjustFreq(-1, false); break;
            case "obs+": this.adjustObs(1); break;
            case "obs-": this.adjustObs(-1); break;
            case "at": this.toggleAT(); break;
            case "spd+": this.adjustSpd(1); break;
            case "spd-": this.adjustSpd(-1); break;
            case "hdg+": case "hdg-": { const d = c === "hdg+" ? 1 : -1; if (an) this.adjustZk(d); else this.adjustHdg(d); break; }
            case "alt+": this.altStep(1); break;
            case "alt-": this.altStep(-1); break;
            case "vs+": this.adjustVS(100); break;
            case "vs-": this.adjustVS(-100); break;
            case "ack":
                this.clearDiscLamps(); this.alr.dAck = true; this.alr.aAck = true;
                break;
            default: return;
        }
        this.updateUI();
    }

    // ===== sygnalizacja wysokosci =====
    _alertTick() {
        const C = AP_CONFIG.alert, c = this.cur, A = this.alr, now = performance.now();
        // OPASNAJA VYSOTA: radiowysokosciomierz ponizej progu
        const rh = this._sv("RADIO HEIGHT", "feet");
        const thr = this.dangerH / 0.3048;
        const below = !c.onGround && isFinite(rh) && rh < Math.min(thr, C.dangerMaxFt);
        const danger = A.danger ? (below || (!c.onGround && isFinite(rh) && rh < thr + 15)) : below;   // histereza 15 ft
        if (danger && !A.danger) { A.dSince = now; A.dAck = false; this.log("OPASN. VYS " + Math.round(rh * 0.3048) + " m"); }
        A.danger = danger;
        // ZAD. VYSOTA: dolot do zadanej wysokosci i odejscie od niej (w trybie VYSOTA)
        if (this.apOn && this.vertMode === "ALT") {
            const err = Math.abs(c.alt - this.altTarget);
            if (A.tgt !== this.altTarget) { A.tgt = this.altTarget; A.cap = false; }
            let st = null;
            if (!A.cap) {
                if (err <= C.altDevFt) A.cap = true;
                else if (err <= C.altWindowFt) st = "near";
            } else if (err > C.altDevFt) st = "dev";
            if (st !== A.alt) { A.alt = st; A.aSince = now; A.aAck = false; }
        } else { A.alt = null; A.tgt = null; A.cap = false; }
    }

    setDangerH(v) {
        this.dangerH = apClamp(Math.round(v), 10, 750);
        try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "dangerH", String(this.dangerH)); } catch (e) { }
        const ft = !this.altMetric;
        this._setNotice(AP_LABELS.lampDanger + " " + (ft ? Math.round(this.dangerH / 0.3048 / 10) * 10 + " " + AP_LABELS.ft : this.dangerH + " " + AP_LABELS.m), 2500);
        this.updateUI();
    }

    // ===== tlumik odchylenia (DEMPFER) =====
    toggleYd() {
        if (!this.ydOn && this._lockOther()) { this._setNotice("lockOther", 4000); this.updateUI(); return; }
        this.ydOn = !this.ydOn;
        try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "yd", this.ydOn ? "1" : "0"); } catch (e) { }
        if (this.ydOn && this.controlModes[this.controlModeIndex].key === "rtrim") this._setNotice("ydBusy", 4000);
        this.log("DEMPF " + (this.ydOn ? "ON" : "OFF"));
        this.updateUI();
    }

    _ydTick() {
        const C = AP_CONFIG.yd, c = this.cur, Y = this._yd, now = performance.now() / 1000;
        const ias = this._sv("AIRSPEED INDICATED", "knots");
        const ok = this.ydOn && !c.onGround && ias > C.minIasKt && !this.cws && this.controlModes[this.controlModeIndex].key !== "rtrim";
        if (!ok) {
            if (Y.active) {                                    // oddaj trymer steru kierunku w stanie sprzed wlaczenia
                Y.active = false;
                try { SimVar.SetSimVarValue("RUDDER TRIM PCT", "Percent Over 100", Y.base); } catch (e) { }
            }
            Y.t = null;
            return;
        }
        if (!Y.active) {
            Y.active = true;
            Y.base = this._sv("RUDDER TRIM PCT", "Percent Over 100") || 0;
            this.ydPID.reset(); Y.t = null; Y.bad = 0; Y.sampleT = now; Y.sampleB = 0;
        }
        if (Y.t === null) { Y.t = now; return; }
        const dt = now - Y.t;
        if (dt <= 0) return;
        Y.t = now;
        if (dt > 0.5) { this.ydPID.reset(); return; }
        const beta = apDeg(this._sv("INCIDENCE BETA", "radians") || 0) * this.ydSign;   // kat slizgu [deg]
        const out = this.ydPID.update(beta, -beta, dt, false);
        // zly kierunek dzialania: slizg rosnie mimo pelnej korekty -> odwroc znak
        if (C.autoSign && now - Y.sampleT >= 0.5) {
            const grows = Math.abs(beta) > 4 && out * beta > 0 && Math.abs(out) > 0.2 && Math.abs(beta) > Math.abs(Y.sampleB) + 0.2;
            Y.bad = grows ? Y.bad + (now - Y.sampleT) : Math.max(0, Y.bad - (now - Y.sampleT));
            Y.sampleT = now; Y.sampleB = beta;
            if (Y.bad >= 2.5) {
                this.ydSign = -this.ydSign;
                try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "ydSign", String(this.ydSign)); } catch (e) { }
                this.ydPID.reset(); Y.bad = 0;
                this._setNotice("ydSign", 4000);
                this.log("DEMPF: sign -> " + this.ydSign);
                SimVar.SetSimVarValue("RUDDER TRIM PCT", "Percent Over 100", Y.base);
                return;
            }
        }
        SimVar.SetSimVarValue("RUDDER TRIM PCT", "Percent Over 100", apClamp(Y.base + out * C.authority, -1, 1));
        if (this._logOn() && (++this._ydDbg || (this._ydDbg = 1)) % 20 === 0)
            this.log("YD beta " + beta.toFixed(1) + " out " + out.toFixed(2));
    }

    _updateDiscLamps() {
        const R = this.radioEl;
        if (!R || !R.annRoll) return;
        const blink = performance.now() - this.disc.since < AP_CONFIG.disc.blinkMs;
        const phase = !blink || (Math.floor(performance.now() / 500) % 2 === 0);
        const set = (el, on) => { if (on) el.setAttribute("activated", "true"); else el.removeAttribute("activated"); };
        set(R.annRoll, this.disc.roll && phase);
        set(R.annPitch, this.disc.pitch && phase);
        const A = this.alr, now = performance.now(), blinkPh = Math.floor(now / 400) % 2 === 0;
        if (R.annDanger) set(R.annDanger, A.danger && (A.dAck || now - A.dSince > 4000 || blinkPh));
        if (R.annAlt) set(R.annAlt, A.alt === "near" || (A.alt === "dev" && (A.aAck || blinkPh)));
        if (R.annYd) set(R.annYd, this._yd.active);
        if (this._atBtn) {
            const lit = !!this.atOn;
            if (this._atBtn._lit !== lit) { this._atBtn._lit = lit; if (lit) this._atBtn.classList.add("sv-litc"); else this._atBtn.classList.remove("sv-litc"); }
        }   // dempfer pracuje (wlaczony, w powietrzu, predkosc > minimum)
    }

    // ===== NVU radiowe: ARK (NDB) i VOR =====
    _bindRadio(R) {
        this.radioEl = R;
        const on = (el, ev, fn) => { if (el) el.addEventListener(ev, fn); };
        on(R.srcbtn, "click", (ev) => {        // gora / srodek / dol przelacznika = MARSH / ARK / VOR
            const r = R.srcbtn.getBoundingClientRect();
            const f = (ev.clientY - r.top) / Math.max(1, r.height * 0.8);
            this.setNavSrc(f < 0.34 ? "RTE" : (f < 0.67 ? "ADF" : "VOR"));
        });
        on(R.srcbtn, "wheel", (ev) => {
            const order = ["RTE", "ADF", "VOR"], i = order.indexOf(this.navSrc);
            this.setNavSrc(order[apClamp(i + (ev.deltaY > 0 ? 1 : -1), 0, 2)]);
        });
        this._hold(R.freqinc, (ev) => this.adjustFreq(1, !!(ev && ev.shiftKey)));
        this._hold(R.freqdec, (ev) => this.adjustFreq(-1, !!(ev && ev.shiftKey)));
        on(R.freqCounter, "wheel", (ev) => this.adjustFreq(ev.deltaY < 0 ? 1 : -1, !!ev.shiftKey));
        this._hold(R.obsinc, (ev) => this.adjustObs(ev && ev.shiftKey ? 10 : 1));
        this._hold(R.obsdec, (ev) => this.adjustObs(ev && ev.shiftKey ? -10 : -1));
        on(R.obsCounter, "wheel", (ev) => this.adjustObs((ev.deltaY < 0 ? 1 : -1) * (ev.shiftKey ? 10 : 1)));
        if (R.tfsw && R.tfsw.parentNode) on(R.tfsw.parentNode, "click", () => this.toggleNavDir());
        on(R.annRoll, "click", () => this.clearDiscLamps());
        on(R.annPitch, "click", () => this.clearDiscLamps());
        on(R.annDanger, "click", () => { this.alr.dAck = true; this.setDangerH(this.dangerH); });
        on(R.annDanger, "wheel", (ev) => this.setDangerH(apSnap(this.dangerH, (ev.deltaY < 0 ? 1 : -1) * (ev.shiftKey ? 50 : 10))));
        on(R.annAlt, "click", () => { this.alr.aAck = true; this.updateUI(); });
        on(R.annYd, "click", () => this.toggleYd());
    }

    _sv(n, u) { try { return SimVar.GetSimVarValue(n, u); } catch (e) { return 0; } }

    cycleNavSrc() {
        const order = ["RTE", "ADF", "VOR"];
        this.setNavSrc(order[(order.indexOf(this.navSrc) + 1) % order.length]);
    }

    // zrodlo NVU: RTE (trasa z EFB), ADF (ARK), VOR
    setNavSrc(src) {
        if (src === this.navSrc) return;
        this.navSrc = src;
        this._vorSide = null; this._vor.next = 0;
        try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "navsrc", this.navSrc); } catch (e) { }
        this._lastNavCmd = null; this._adf.ahead = 0;
        if (this.apOn && this.latMode === "NAV") {
            if (this.navSrc === "RTE") this.loadRoute((ok) => { if (!ok && this.latMode === "NAV") { this._holdCurrentHeading(); this._setNotice("NO ROUTE"); } });
            else if (!this._radioHasSignal()) this._setNotice("noSignal");
        }
        this.log("NVU source: " + this.navSrc);
        this.updateUI();
    }

    _setNavDir(d) {
        this.navDir = d;
        try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "navdir", d); } catch (e) { }
    }

    // przelacznik NA / OT
    toggleNavDir() {
        const to = this.navDir !== "TO";
        this._setNavDir(to ? "TO" : "FROM");
        this._vorSide = null;
        this._adf.ahead = 0;
        if (!to && this.navSrc === "ADF") {                 // OT: ZPU = obecny namiar od radiolatarni (albo kurs)
            try { this.readStates(); } catch (e) { }
            const rel = this._sv("ADF RADIAL:1", "degrees");
            this.adfCrs = (this._sv("ADF SIGNAL:1", "number") > 0 && isFinite(rel))
                ? apWrap360(Math.round(this.cur.hdg + rel + 180)) : apWrap360(Math.round(this.cur.hdg));
        }
        this.log("NA/OT -> " + this.navDir + (this.navSrc === "ADF" && !to ? " ZPU " + this.adfCrs : ""));
        this.updateUI();
    }

    _radioHasSignal() {
        if (this.navSrc === "ADF") return this._sv("ADF SIGNAL:1", "number") > 0;
        if (this.navSrc === "VOR") return this._vorRead().has;
        return true;
    }

    _holdCurrentHeading() {
        this.latMode = "HDG";
        this.setHdgTarget(this.cur.hdg);
    }

    _navNoSignal() {
        const now = performance.now();
        if (now - this._noSigT > 4000) { this._noSigT = now; this._setNotice("noSignal"); }
        return (this._lastNavCmd !== null) ? this._lastNavCmd : this.cur.track;   // bez sygnalu: trzymaj ostatni kurs drogi
    }

    // ARK: lot na radiolatarnie NDB (kurs drogi = namiar na stacje, wiec wiatr jest korygowany)
    _navAdf() {
        const c = this.cur, Rr = AP_CONFIG.radio, A = this._adf, now = performance.now();
        const rel = this._sv("ADF RADIAL:1", "degrees");          // KUR: kat od dziobu do NDB
        if (!(this._sv("ADF SIGNAL:1", "number") > 0) || !isFinite(rel)) return this._navNoSignal();
        const relW = apWrap180(rel);
        const brgMag = apWrap360(c.hdg + rel);
        if (this.navDir === "FROM") {                         // OT: utrzymanie linii ZPU od radiolatarni
            const qdr = apWrap360(brgMag + 180);
            const e = apWrap180(qdr - this.adfCrs);           // + = na prawo od linii ZPU
            const off = apClamp(e * Rr.adfGain, -AP_CONFIG.nav.maxIntercept, AP_CONFIG.nav.maxIntercept);
            const cmdF = apWrap360(this.adfCrs - off + c.magvar);
            this._navInfo = { dist: 0, xtk: 0, dtk: cmdF, crsMag: this.adfCrs, cmdTrack: cmdF, kur: apWrap360(rel), radial: qdr, toFrom: 1 };
            this._lastNavCmd = cmdF;
            return cmdF;
        }
        if (Math.abs(relW) < Rr.adfPassLo) { A.ahead = now; A.lastQdm = brgMag; }
        if (A.ahead && Math.abs(relW) > Rr.adfPassHi && now - A.ahead < 15000) {   // przelot nad radiolatarnia
            A.ahead = 0;
            this._setNotice("ndbPass", 5000);
            if (Rr.autoFrom && A.lastQdm !== null) {
                this.adfCrs = apWrap360(Math.round(A.lastQdm));
                this._setNavDir("FROM");
                this.log("NDB PASS -> OT ZPU " + this.adfCrs);
                return this._navAdf();
            }
            this._holdCurrentHeading();
            this.log("NDB PASS -> HDG " + this.hdgTarget);
            return null;
        }
        const cmd = apWrap360(brgMag + c.magvar);
        this._navInfo = { dist: 0, xtk: 0, dtk: cmd, crsMag: brgMag, cmdTrack: cmd, kur: apWrap360(rel), radial: 0, toFrom: 0 };
        this._lastNavCmd = cmd;
        return cmd;
    }

    // VOR: lot po radialu ustawionym na OBS (do stacji albo od stacji), przechwycenie jak w trasie
    _navVor() {
        const c = this.cur, Rr = AP_CONFIG.radio, N = AP_CONFIG.nav;
        const VR = this._vorRead();
        const rad = VR.rad;                                            // radial, na ktorym jest samolot
        const obs = VR.obs;
        if (!VR.has || !isFinite(rad) || !isFinite(obs)) return this._navNoSignal();
        const hasDme = VR.hasDme;
        const dme = VR.dme;
        const fromSide = Math.abs(apWrap180(rad - obs)) <= 90;   // samolot po stronie "OT" wzgledem kursu OBS
        let crs = obs;
        if (this.navDir === "TO") {
            const steady = this._vorObs !== null && Math.abs(apWrap180(obs - this._vorObs)) < 1;
            if (steady && !VR.loc && this._vorSide !== null && fromSide !== this._vorSide && (!hasDme || dme < 5)) {
                const prev = this._vorSide ? apWrap360(obs + 180) : obs;    // kurs, ktorym przelecielismy nad stacja
                this._vorSide = null; this._vorObs = null;
                this._setNotice("vorPass", 5000);
                if (Rr.autoFrom) {
                    this._setNavDir("FROM");
                    if (Math.abs(apWrap180(prev - obs)) > 1) this._vorSetObs(prev);
                    this.log("VOR PASS -> OT " + Math.round(prev));
                    crs = prev;
                }
            } else {
                this._vorSide = fromSide; this._vorObs = obs;
                if (fromSide) crs = apWrap360(obs + 180);   // NA z drugiej strony: wracamy do stacji po tej samej linii
            }
        }
        let e = apWrap180(rad - crs), from = true;
        if (Math.abs(e) > 90) { e = apWrap180(rad - crs - 180); from = false; }
        let off, xtk;
        if (hasDme) {
            xtk = dme * Math.sin(apRad(e));
            off = (dme < Rr.vorStationNm) ? 0 : apClamp(xtk * N.interceptGain, -N.maxIntercept, N.maxIntercept);
        } else {
            xtk = 0;
            off = apClamp(e * Rr.vorGainNoDme, -N.maxIntercept, N.maxIntercept);
        }
        const cmdMag = from ? crs - off : crs + off;
        const cmd = apWrap360(cmdMag + c.magvar);
        this._navInfo = { dist: dme, xtk: hasDme ? (from ? xtk : -xtk) : 0, dtk: cmd, crsMag: apWrap360(crs), cmdTrack: cmd,
            kur: 0, radial: apWrap360(rad), toFrom: from ? 1 : 0 };
        this._lastNavCmd = cmd;
        return cmd;
    }

    _navText() {
        const L = AP_LABELS, ni = this._navInfo, p3 = (v) => String(Math.round(v || 0) % 360).padStart(3, "0");
        const tf = L.toFrom[this.navDir === "FROM" ? 1 : 0];
        if (this.navSrc === "ADF") return this.navDir === "FROM" ? L.srcNames.ADF + " " + tf + " " + p3(this.adfCrs) : L.srcNames.ADF + " " + tf + " " + L.kur + " " + p3(ni.kur);
        if (this.navSrc === "VOR") {
            const VR = this._vorRead();
            const kind = VR.loc ? L.krm : "VOR";
            if (!VR.has) return kind + " " + (VR.ident || L.vorNone);
            return kind + " " + (VR.ident ? VR.ident + " " : "") + p3(ni.crsMag) + " " + tf + " " + Math.round(VR.dme);
        }
        const pad2 = (n) => String(n).padStart(2, "0");
        return L.nvu + " " + (this.route.pts.length ? pad2(this.route.idx + 1) + "/" + pad2(this.route.pts.length) : "--");
    }

    // strojenie radia: VOR co 50 kHz (Shift: 1 MHz), ARK co 1 kHz (Shift: 10 kHz)
    adjustFreq(dir, big) {
        try {
            if (this.navSrc === "VOR" && this._vorVirtual()) {
                let f = apSnap(this.vorFreq, dir * (big ? 1 : 0.05));
                f = Math.round(f * 100) / 100;
                if (f > 117.95) f = 108; if (f < 108) f = 117.95;
                this._vorSetFreq(f);
                this.log("VOR -> " + f.toFixed(2));
            } else if (this.navSrc === "VOR") {
                let f = this._sv("NAV ACTIVE FREQUENCY:1", "MHz");
                if (this._radioPend && this._radioPend.until > performance.now() && this._radioPend.freq) f = this._radioPend.freq;
                if (!(f >= 108 && f <= 118)) f = 108;
                f = Math.round(apSnap(f, dir * (big ? 1 : 0.05)) * 100) / 100;
                if (f > 117.95) f = 108; if (f < 108) f = 117.95;
                SimVar.SetSimVarValue("K:NAV1_RADIO_SET_HZ", "Hz", Math.round(f * 1e6));
                this._radioPend = { freq: f, until: performance.now() + 900 };
                this.log("NAV1 -> " + f.toFixed(2));
            } else if (this.navSrc === "ADF") {
                let f = this._sv("ADF ACTIVE FREQUENCY:1", "KHz");
                if (this._radioPend && this._radioPend.until > performance.now() && this._radioPend.freq) f = this._radioPend.freq;
                if (!(f >= 190 && f <= 1799)) f = 190;
                f = apClamp(Math.round(apSnap(Math.round(f), dir * (big ? 10 : 1))), 190, 1799);
                const bcd = parseInt(String(Math.round(f * 1000)), 16);       // BCD: 345 kHz -> 0x345000
                SimVar.SetSimVarValue("K:ADF_ACTIVE_SET", "Frequency ADF BCD32", bcd);
                this._radioPend = { freq: f, until: performance.now() + 900 };
                this.log("ADF1 -> " + f);
            }
        } catch (e) { this.log("radio: " + e, "ERROR"); }
        this.updateUI();
    }

    adjustObs(delta) {
        if (this.navSrc === "ADF") {
            if (this.navDir !== "FROM") return;
            this.adfCrs = apWrap360(Math.round(apSnap(this.adfCrs, delta)));
            this.updateUI();
            return;
        }
        if (this.navSrc !== "VOR") return;
        try { this._vorSetObs(apSnap(Math.round(this._vorRead().obs || 0), delta)); } catch (e) { this.log("obs: " + e, "ERROR"); }
        this.updateUI();
    }

    _updateRadioUI() {
        const R = this.radioEl;
        if (!R || !R.srcbtn) return;
        const L = AP_LABELS, src = this.navSrc, now = performance.now();
        const pend = (this._radioPend && this._radioPend.until > now) ? this._radioPend : {};
        const lv = R.srcbtn.querySelector(".sv-tf"), pos = { RTE: "up", ADF: "mid", VOR: "down" }[src] || "up";
        if (lv && lv.getAttribute("data-pos") !== pos) {
            lv.setAttribute("data-pos", pos);
            const sl = R.srcbtn.querySelectorAll(".sv-sl");
            for (let i = 0; i < sl.length; i++) { if (i === ["up", "mid", "down"].indexOf(pos)) sl[i].classList.add("sv-on"); else sl[i].classList.remove("sv-on"); }
        }
        if (R.tfsw) {
            const pos = this.navDir === "FROM" ? "down" : "up";
            if (R.tfsw.getAttribute("data-pos") !== pos) R.tfsw.setAttribute("data-pos", pos);
            const lab = R.tfsw.parentNode.querySelectorAll(".sv-tfl");
            if (lab.length === 2) { if (pos === "up") lab[0].classList.add("sv-on"); else lab[0].classList.remove("sv-on"); if (pos === "down") lab[1].classList.add("sv-on"); else lab[1].classList.remove("sv-on"); }
        }
        if (R.obsCounterCap) {
            const cap = (src === "ADF") ? "zpu" : "obs";
            if (R._ocap !== cap) { R._ocap = cap; R.obsCounterCap.innerHTML = apRu(cap === "zpu" ? L.crs : L.obs); }
        }
        const active = this.apOn && this.latMode === "NAV" && src !== "RTE";
        if (src === "VOR") {
            const VR = this._vorRead();
            this._renderCells(R.freqCounter, (VR.freq || 0).toFixed(2).padStart(6, "0"), false, false);
            this._renderCounter(R.obsCounter, (VR.obs || 0) % 360, 3, false);
            if (R._cap !== "rad") { R.kurCounterCap.innerHTML = apRu(L.rad); R._cap = "rad"; }
            this._renderCounter(R.kurCounter, VR.has ? apWrap360(VR.rad) % 360 : 0, 3, !VR.has);
        } else if (src === "ADF") {
            const f = pend.freq || this._sv("ADF ACTIVE FREQUENCY:1", "KHz") || 0;
            this._renderCells(R.freqCounter, f.toFixed(1).padStart(6, "0"), !active, false);
            this._renderCounter(R.obsCounter, this.navDir === "FROM" ? this.adfCrs : 0, 3, !(active && this.navDir === "FROM"));
            const sig = this._sv("ADF SIGNAL:1", "number") > 0;
            if (R._cap !== "kur") { R.kurCounterCap.innerHTML = apRu(L.kur); R._cap = "kur"; }
            this._renderCounter(R.kurCounter, sig ? apWrap360(this._sv("ADF RADIAL:1", "degrees")) % 360 : 0, 3, !(active && sig));
        } else {
            this._renderCells(R.freqCounter, "000.00", true, false);
            this._renderCounter(R.obsCounter, 0, 3, true);
            this._renderCounter(R.kurCounter, 0, 3, true);
        }
    }

    onVSClicked() {
        if (!this.apOn) {
            if (!this.engage()) { this.updateUI(); return; }
            this.latMode = "LVL";
        }
        if (this.vertMode === "VS") {
            this.vertMode = "LVL";                      // VS wylaczony -> lot poziomy (VS 0)
        } else {
            this.vertMode = "VS";
            try { this.readStates(); } catch (e) { }
            this.vsTarget = apClamp(Math.round(this.cur.vs / 100) * 100, -AP_CONFIG.maxSelVS, AP_CONFIG.maxSelVS);
        }
        this.log("VS " + this.vertMode + " target " + this.vsTarget);
        this.updateUI();
    }

    adjustVS(delta) {
        if (this.vertMode !== "VS") return;             // cel VS ustawia sie przy wlaczeniu trybu
        this.vsTarget = apClamp(apSnap(this.vsTarget, delta), -AP_CONFIG.maxSelVS, AP_CONFIG.maxSelVS);
        this.updateUI();
    }

    setHdgTarget(v) {
        this.hdgTarget = apWrap360(Math.round(v));
        try { SimVar.SetSimVarValue("K:HEADING_BUG_SET", "degrees", this.hdgTarget); } catch (e) { }
        this.updateUI();
    }

    adjustHdg(delta) {
        this.setHdgTarget(apSnap(this.hdgTarget, delta));
    }

    adjustAlt(delta) {
        if (this.vertMode !== "ALT") return;           // ALT ustawia sie przy wlaczeniu trybu
        this.altTarget = Math.max(0, apSnap(Math.round(this.altTarget), delta));
        this.updateUI();
    }

    // ===== Wysokosc: jednostki (ft / m) i krok wybierany cyfra licznika =====
    _altDisp(ft) { return this.altMetric ? ft * 0.3048 : ft; }

    _altStr() {
        return Math.round(this._altDisp(this.altTarget)) + " " + (this.altMetric ? AP_LABELS.m : AP_LABELS.ft);
    }

    // n krokow o wybrana cyfre (Shift = x10), w aktualnych jednostkach
    altStep(n) {
        if (this.vertMode !== "ALT") return;           // cel ALT ustawia sie przy wlaczeniu trybu
        const step = n * this.altPlace;
        if (this.altMetric) {
            const m = Math.max(0, apSnap(Math.round(this.altTarget * 0.3048), step));
            this.altTarget = m / 0.3048;
        } else {
            this.altTarget = Math.max(0, apSnap(Math.round(this.altTarget), step));
        }
        this.updateUI();
    }

    toggleAltUnit() {
        this.altMetric = !this.altMetric;
        try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "altunit", this.altMetric ? "m" : "ft"); } catch (e) { }
        this.updateUI();
    }

    // licznik wysokosci: klik w cyfre wybiera krok strzalek, kolko nad cyfra zmienia te cyfre
    _bindAlt(ctr, cap, unitBtn) {
        this._altCapEl = cap;
        this._unitBtnEl = unitBtn;
        if (unitBtn) unitBtn.addEventListener("click", () => this.toggleAltUnit());
        if (!ctr) return;
        ctr.classList.add("sv-altctr");
        const placeOf = (ev) => {
            let el = ev.target;
            while (el && el !== ctr && !(el.classList && el.classList.contains("sv-cell"))) el = el.parentNode;
            if (!el || el === ctr) return null;
            const cells = Array.prototype.slice.call(ctr.querySelectorAll(".sv-cell"));
            const i = cells.indexOf(el);
            return (i < 0) ? null : Math.pow(10, cells.length - 1 - i);
        };
        ctr.addEventListener("mousedown", (ev) => {
            const p = placeOf(ev);
            if (p) { this.altPlace = p; this.updateUI(); }
        });
        ctr.addEventListener("wheel", (ev) => {
            const p = placeOf(ev);
            if (p) this.altPlace = p;
            this.altStep((ev.deltaY < 0 ? 1 : -1) * (ev.shiftKey ? 10 : 1));
        });
    }

    // podkreslenie wybranej cyfry, podpis grupy i przycisk jednostek
    _altUiExtra(ctr, cap, unitBtn) {
        const L = AP_LABELS;
        if (ctr) {
            const cells = ctr.querySelectorAll(".sv-cell");
            const pick = cells.length - 1 - Math.round(Math.log(this.altPlace) / Math.LN10);
            for (let i = 0; i < cells.length; i++) {
                if (i === pick) cells[i].classList.add("sv-pick"); else cells[i].classList.remove("sv-pick");
            }
        }
        const unit = this.altMetric ? "m" : "ft";
        if (cap && cap._u !== unit) { cap._u = unit; cap.innerHTML = apRu(this.altMetric ? L.altGroupM : L.altGroup); }
        if (unitBtn && unitBtn._u !== unit) { unitBtn._u = unit; unitBtn.innerHTML = apRu(L.unit + " " + (this.altMetric ? L.m : L.ft)); }
    }

    onControlsClicked() {
        this.controlModeIndex = (this.controlModeIndex + 1) % this.controlModes.length;
        try { window.localStorage.setItem(AP_CONFIG.storagePrefix + "controlMode", String(this.controlModeIndex)); } catch (e) { }
        this.log("Control mode: " + this.controlModes[this.controlModeIndex].key);
        this.updateUI();
    }

    // ----- interfejs -----
    updateUI() {
        try {
            if (this.skinKind === "an28") {
                this._updateAn28();
                this._fitSkin();
                return;
            }
            if (!this.skinOn) return;
            this._updateTextRU();
            this.updateButtons();
            this.updateHdgIndicator();
            this._fitSkin();
        } catch (e) {
            this.log("Error in updateUI: " + e, "ERROR");
        }
    }

    _updateTextRU() {
        const L = AP_LABELS;
        const pad2 = (n) => String(n).padStart(2, "0");
        const pad3 = (n) => String(Math.round(n) % 360).padStart(3, "0");
        const lat = { OFF: "---", LVL: L.shortLvl, HDG: L.shortHdg, NAV: this.navSrc === "RTE" ? L.nvu : L.srcNames[this.navSrc] };
        const vert = { OFF: "---", LVL: L.shortLvl, ALT: L.shortAlt, VS: L.shortVs };
        let line1, line2 = "";
        if (this.apOn) {
            line1 = L.apOn + "   " + lat[this.latMode] + "  " + vert[this.vertMode];
            if (this.latMode === "HDG") line2 += L.shortHdg + " " + pad3(this.hdgTarget) + "   ";
            if (this.latMode === "NAV") line2 += this._navText() + "   ";
            if (this.vertMode === "ALT") line2 += L.shortAlt + " " + this._altStr();
            if (this.vertMode === "VS") line2 += L.shortVs + " " + (this.vsTarget >= 0 ? "+" : "-") + Math.abs(this.vsTarget);
        } else {
            line1 = L.apOff;
        }
        if (performance.now() < this._noticeUntil) {
            const map = { "NA ZIEMI": L.ground, "NO ROUTE": L.noRoute, "ROUTE END": L.routeEnd, "LOADING": L.loading };
            line2 = map[this._notice] || L[this._notice] || this._notice;
        }
        if (this.atOn && performance.now() >= this._noticeUntil) line2 = this._atStr() + "   " + line2;
        if (!line2) line2 = " ";
        this.apTextLabel.innerHTML = apRu(line1) + "<br>" + apRu(line2);
    }

    updateButtons() {
        const set = (btn, active) => {
            if (!btn) return;
            if (active) btn.setAttribute("activated", "true"); else btn.removeAttribute("activated");
        };
        set(this.btnAP, this.apOn);
        set(this.btnLVL, this.apOn && this.latMode === "LVL" && this.vertMode === "LVL");
        set(this.btnHDG, this.apOn && this.latMode === "HDG");
        set(this.btnALT, this.apOn && this.vertMode === "ALT");
        set(this.btnVS, this.apOn && this.vertMode === "VS");
        set(this.btnNAV, this.apOn && this.latMode === "NAV");
        set(this.btnAT, this.atOn);

        if (this.skinOn) {
            this._renderCounter(this.elHdgCounter, this.hdgTarget % 360, 3, false);
            const altMode = this.apOn && this.vertMode === "ALT";
            this._renderCounter(this.elAltCounter, this._altDisp(altMode ? this.altTarget : this.cur.alt), 5, !altMode);
            if (this.radioEl) this._altUiExtra(this.elAltCounter, this._altCapEl, this._unitBtnEl);
            const vsMode = this.apOn && this.vertMode === "VS";
            this._renderCounter(this.elVsCounter, vsMode ? this.vsTarget : Math.round(this.cur.vs / 10) * 10, 4, !vsMode, true);
            const navOn = this.apOn && this.latMode === "NAV" && this.navSrc === "RTE" && this.route.pts.length > 0;
            const ni = this._navInfo;
            this._renderCounter(this.elWpCounter, this.route.pts.length ? this.route.idx + 1 : 0, 2, !navOn);
            this._renderCounter(this.elDistCounter, navOn ? ni.dist : 0, 3, !navOn);
            this._renderCounter(this.elCrsCounter, navOn ? ni.crsMag : 0, 3, !navOn);
            const xv = navOn ? ni.xtk : 0;
            this._renderCells(this.elXtkCounter, (xv < 0 ? "-" : "+") + Math.min(9.9, Math.abs(xv)).toFixed(1), !navOn, true);
            if (this.btnControls)
                this.btnControls.innerHTML = apRu(AP_LABELS.ctl + " \u00b7 " + AP_LABELS.ctlModes[this.controlModeIndex]);
            this._updateRadioUI();
            this._updateDiscLamps();
        }
    }

    updateHdgIndicator() {
        if (this.elNeedle)
            this.elNeedle.setAttribute("transform", "rotate(" + apWrap180(this.hdgTarget - this.cur.hdg).toFixed(1) + " 50 50)");
    }
}

window.customElements.define("ap28-panel", AP28Panel);
checkAutoload();
