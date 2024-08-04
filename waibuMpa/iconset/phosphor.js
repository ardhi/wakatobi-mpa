const mapping = {
  _notFound: 'image-broken',
  home: 'house',
  addressBook: '',
  airplane: '',
  airplaneTakeoff: '',
  airplaneLanding: '',
  airplay: '',
  alarm: '',
  alien: '',
  // align
  alignBottom: '',
  alignTop: '',
  alignStart: 'align-left',
  alignEnd: 'align-right',
  alignCenterHorizontal: '',
  alignCenterVertical: '',
  //
  ambulance: '',
  anchor: 'anchor-simple',
  angle: '',
  aperture: '',
  archive: '',
  // arrow
  arrowDown: '',
  arrowUp: '',
  arrowStart: 'arrow-left',
  arrowEnd: 'arrow-right',
  arrowCircleDown: '',
  arrowCircleUp: '',
  arrowCircleStart: 'arrow-circle-left',
  arrowCircleEnd: 'arrow-circle-right',
  arrowFatDown: '',
  arrowFatUp: '',
  arrowFatStart: 'arrow-fat-left',
  arrowFatEnd: 'arrow-fat-right',
  arrowSquareDown: '',
  arrowSquareUp: '',
  arrowSquareStart: 'arrow-square-left',
  arrowSquareEnd: 'arrow-square-right',
  arrowClockwise: '',
  arrowAntiClockwise: 'arrow-counter-clockwise',
  arrowsIn: '',
  arrowsOut: '',
  arrowsInLineHorizontal: '',
  arrowsOutLineHorizontal: '',
  arrowsInLineVertical: '',
  arrowsOutLineVertical: '',
  arrowsSplit: '',
  arrowsMerge: '',

  article: '',
  asterisk: '',
  at: '',
  atom: '',
  axe: '',
  baby: '',
  bag: '',
  balloon: '',
  bank: '',
  barcode: '',
  barn: '',
  barricade: '',
  baseball: '',
  basket: '',
  basketball: '',
  // battery
  batteryCharging: '',
  batteryEmpty: '',
  batteryFull: '',
  batteryHigh: '',
  batteryLow: '',

  bed: '',
  beer: 'beer-stein',

  bell: '',
  bellRinging: '',
  bellSlash: '',
  bellZ: '',

  bicycle: '',
  binary: '',
  binocular: 'binoculars',
  bird: '',

  bluetooth: '',
  bluetoothConnected: '',
  bluetoothSlash: '',
  bluetoothOff: 'bluetooth-x',

  boat: '',
  bomb: '',
  book: '',
  bookOpen: '',
  bookmark: 'bookmark-simple',
  boot: '',
  bowl: 'bowl-steam',
  bread: '',
  bridge: '',
  briefcase: '',
  broadcast: '',
  broom: '',
  bug: '',
  building: '',
  buildings: '',
  bulldozer: '',
  bus: '',
  butterfly: '',
  cableCar: '',
  cactus: '',
  cake: '',
  calculator: '',
  calendar: '',
  calendarDots: '',
  callBell: '',
  camera: '',
  campfire: '',
  car: '',
  carBattery: '',
  cardHolder: 'cardholder',
  cards: 'cards-three',
  // caret
  caretDown: '',
  caretUp: '',
  caretStart: 'caret-left',
  caretEnd: 'caret-right',
  caretUpDown: '',

  cashRegister: '',
  cat: '',
  // cell signal
  cellSignalFull: '',
  cellSignalHigh: '',
  cellSignalLow: '',
  cellSignalMed: 'cell-signal-medium',
  cellSignalSlash: '',
  cellSignalX: '',

  cellTower: '',
  certificate: '',
  chair: '',
  champagne: '',
  chargingStation: '',
  // chart
  chartPie: '',
  chartBar: '',
  chartBarHorizontal: '',
  chartPieSlice: '',
  chartLine: '',
  chartLineUp: '',
  chartLineDown: '',
  chartScatter: '',

  chat: '',
  chatDots: '',
  chatSlash: '',
  chatText: '',
  chatCircle: '',
  chatCircleDots: '',
  chatCircleSlash: '',
  chatCircleText: '',
  chats: '',
  chatsCircle: '',

  check: '',
  checkCircle: '',
  checkFat: '',
  checkSquare: '',
  checks: '',

  church: '',
  cigarette: '',
  cigaretteSlash: '',

  circle: '',
  circleNotch: '',
  circlesFour: '',
  circlesThree: '',

  city: '',
  clipboard: '',
  clipboardText: '',

  clock: '',
  clockClockwise: '',
  clockAntiClockwise: 'clock-counter-clockwise',

  closedCaption: 'closed-captioning',

  cloud: '',
  cloudUpload: 'cloud-arrow-up',
  cloudDownload: 'cloud-arrow-down',
  cloudFog: '',
  cloudLightning: '',
  cloudMoon: '',
  cloudRain: '',
  cloudSlash: '',
  cloudSnow: '',
  cloudSun: '',
  cloudX: '',

  clover: '',
  club: '',
  code: '',
  coffee: '',
  coins: '',
  compass: '',
  cookie: '',
  copy: 'copy-simple',
  copyright: '',
  cornersIn: '',
  cornersOut: '',
  couch: '',
  cow: '',
  cowboyHat: '',
  cpu: '',
  crane: '',
  creditCard: '',
  crop: '',
  crosshair: '',
  crown: '',
  cube: '',

  currencyBtc: '',
  currencyDollar: '',
  currencyCny: '',
  currencyEth: '',
  currencyEur: '',
  currencyGbp: '',
  currencyJpy: '',

  cursor: '',
  cursorText: '',

  cylinder: '',
  database: '',
  desktop: '',
  desktopTower: '',

  geomBezier: 'bezier-curve',
  geomBox: 'bounding-box',

  // logo
  logoAmazon: 'amazon-logo',
  logoAndroid: 'android-logo',
  logoAngular: 'angular-logo',
  logoAppstore: 'app-store-logo',
  logoApple: 'apple-logo'
}

function phosphor (ctx) {
  return {
    name: 'phosphor',
    css: 'waibuMpa.virtual:/phosphor/regular/style.css',
    prefix: 'ph ph-',
    mapping
  }
}

export default phosphor
