import { failureText } from "./failures.ts"
import type { Failure } from "./types.ts"

export const languages = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "ko", label: "한국어" },
] as const

export type Language = (typeof languages)[number]["id"]

const languageIds: readonly string[] = languages.map((language) => language.id)

export function languageChoice(input: {
  query: string | null
  cookie: string | null
  accept: string | null
}): { language: Language; remember: Language | null } {
  const query = known(input.query)
  if (query) return { language: query, remember: query }
  const cookie = known(input.cookie)
  if (cookie) return { language: cookie, remember: null }
  return { language: fromAccept(input.accept) ?? "en", remember: null }
}

function known(value: string | null): Language | null {
  if (value && languageIds.includes(value)) return value as Language
  return null
}

function fromAccept(header: string | null): Language | null {
  if (!header) return null
  let best: { language: Language; q: number; index: number } | null = null
  const parts = header.split(",")
  for (let index = 0; index < parts.length; index++) {
    const [tag, ...params] = parts[index].trim().split(";")
    const primary = tag.toLowerCase().split("-")[0]
    if (!languageIds.includes(primary)) continue
    const qParam = params.find((param) => param.trim().startsWith("q="))
    const q = qParam ? Number(qParam.trim().slice(2)) : 1
    if (!Number.isFinite(q) || q <= 0) continue
    if (!best || q > best.q) best = { language: primary as Language, q, index }
  }
  return best?.language ?? null
}

const en = {
  switchLabel: "Language",
  wholesale: "Wholesale",
  signOut: "Sign out",
  confirmed: "Confirmed",
  unconfirmed: "Unconfirmed",
  pickup: "Pickup",
  delivery: "Delivery",
  goods: "Goods",
  staff: "Staff",
  colorSize: "{color}, size {size}",
  namedSku: "{name}, {color}, size {size}",
  signIn: {
    title: "Sign in",
    lede: "CDA sells clothing wholesale. A Buyer signs in with a code sent to the Square Customer email. Staff sign in with a password for this app.",
    buyerEmail: "Buyer email",
    code: "Sign-in code",
    emailCode: "Email a code",
    staffEmail: "Staff email",
    password: "Password",
    staffSubmit: "Sign in as Staff",
    localCode: "Local inbox code: {code}.",
    localHint: "Local Staff sign-in is staff@cda.example with password cda-staff. The Buyer fixture is buyer@atelier.example.",
  },
  nav: {
    line: "Line",
    orders: "Orders",
    deliveryZips: "Delivery zips",
    orderingCopy: "Ordering copy",
  },
  failures: failureText satisfies Record<Failure, string>,
  line: {
    pickupAt: "Pickup is at {name}, {address}. Times use {timezone}.",
    locationUnread: "The Pickup location could not be read.",
    empty: "No Styles are on the Line.",
    quantity: "Quantity",
    time: "Time",
    street: "Street",
    city: "City",
    state: "State",
    zip: "Zip",
    phone: "Phone",
    note: "Delivery note",
    place: "Place Order",
    unread: "The Line could not be read.",
  },
  orders: {
    title: "Orders",
    empty: "No Orders yet.",
    choose: "Choose from the Line.",
    season: "Season",
    when: "When",
    way: "Way",
    confirmation: "Confirmation",
    step: "Step",
    buyer: "Buyer",
    unread: "Orders could not be read.",
  },
  order: {
    title: "Order",
    changeWaiting: "A Change request is waiting.",
    withdraw: "Withdraw the Change request",
    changeTitle: "Change request",
    kept: "(kept on this Order)",
    submitChange: "Submit Change request",
    deliveryCharge: "Delivery charge",
    priceAtApproval: ", price at approval",
  },
  steps: {
    proposed: "Proposed",
    reserved: "Reserved",
    prepared: "Prepared",
    completed: "Completed",
    canceled: "Canceled",
  },
  staffOrder: {
    unitsUnread: "Units on hand could not be read.",
    sku: "SKU",
    quantity: "Quantity",
    price: "Price",
    units: "Units on hand",
    fulfill: "Fulfill this sale in Square, then mark it Completed here.",
    confirm: "Confirm",
    markReserved: "Mark Reserved",
    markPrepared: "Mark Prepared",
    markCompleted: "Mark Completed",
    cancel: "Cancel",
    approve: "Approve",
    deny: "Deny",
  },
  deliveryMap: {
    title: "Delivery zips",
    lede: "A zip is shown when it has a name and a shape. Open it to allow Delivery. Closing it leaves Orders already placed for that zip on Delivery.",
    mapLabel: "Delivery zips",
    open: "Open {name}",
    close: "Close {name}",
    unread: "Delivery zips could not be read.",
  },
}

const es = {
  switchLabel: "Idioma",
  wholesale: "Mayoreo",
  signOut: "Salir",
  confirmed: "Confirmado",
  unconfirmed: "Sin confirmar",
  pickup: "Recogida",
  delivery: "Entrega",
  goods: "Mercancía",
  staff: "Equipo",
  colorSize: "{color}, talla {size}",
  namedSku: "{name}, {color}, talla {size}",
  signIn: {
    title: "Entrar",
    lede: "CDA vende ropa al por mayor. Un comprador entra con un código enviado al correo del cliente de Square. El equipo entra con una contraseña de esta aplicación.",
    buyerEmail: "Correo del comprador",
    code: "Código de acceso",
    emailCode: "Enviar un código",
    staffEmail: "Correo del equipo",
    password: "Contraseña",
    staffSubmit: "Entrar como equipo",
    localCode: "Código del buzón local: {code}.",
    localHint: "El acceso local del equipo es staff@cda.example con la contraseña cda-staff. El comprador de prueba es buyer@atelier.example.",
  },
  nav: {
    line: "Línea",
    orders: "Pedidos",
    deliveryZips: "Códigos de entrega",
    orderingCopy: "Texto de pedidos",
  },
  failures: {
    refused: "El acceso fue rechazado.",
    "no-buyer": "CDA no tiene un comprador con ese correo.",
    "no-season": "No hay una temporada abierta.",
    unreadable: "No se pudo leer. No se guardó nada.",
    "delivery-closed": "Ese código de entrega está cerrado. La recogida sigue disponible.",
    "delivery-unavailable": "No se puede elegir entrega. La recogida sigue disponible.",
    "need-phone": "La entrega necesita un teléfono.",
    "empty-order": "Un pedido necesita al menos un SKU.",
    "bad-quantity": "La cantidad es un número entero positivo.",
    "bad-time": "Esa hora es posterior al fin de la temporada.",
    "not-on-line": "Ese estilo no está en la línea.",
    cutoff: "El plazo de cambios ya pasó.",
    waiting: "Ya hay una solicitud de cambio en espera.",
    "not-found": "Ese pedido no está aquí.",
    forbidden: "Eso no está disponible.",
    "cannot-switch": "Un pedido sigue siendo recogida o entrega.",
    "cannot-advance": "Ese paso no está disponible.",
    unconfirmed: "El equipo confirma el pedido antes de ese paso.",
    "change-waiting": "Una solicitud de cambio en espera impide marcarlo completado.",
    "missing-price": "Un SKU no tiene precio de Square.",
    "zip-closed": "Ese código de entrega no está abierto.",
    "not-on-map": "Ese código no está en el mapa.",
    "bad-address": "Una dirección de entrega necesita calle, ciudad, estado, código postal y teléfono.",
  },
  line: {
    pickupAt: "La recogida es en {name}, {address}. Los horarios usan {timezone}.",
    locationUnread: "No se pudo leer el lugar de recogida.",
    empty: "No hay estilos en la línea.",
    quantity: "Cantidad",
    time: "Hora",
    street: "Calle",
    city: "Ciudad",
    state: "Estado",
    zip: "Código postal",
    phone: "Teléfono",
    note: "Nota de entrega",
    place: "Hacer el pedido",
    unread: "No se pudo leer la línea.",
  },
  orders: {
    title: "Pedidos",
    empty: "Aún no hay pedidos.",
    choose: "Elige en la línea.",
    season: "Temporada",
    when: "Cuándo",
    way: "Modo",
    confirmation: "Confirmación",
    step: "Paso",
    buyer: "Comprador",
    unread: "No se pudieron leer los pedidos.",
  },
  order: {
    title: "Pedido",
    changeWaiting: "Hay una solicitud de cambio en espera.",
    withdraw: "Retirar la solicitud de cambio",
    changeTitle: "Solicitud de cambio",
    kept: "(sigue en este pedido)",
    submitChange: "Enviar solicitud de cambio",
    deliveryCharge: "Cargo de entrega",
    priceAtApproval: ", precio al aprobar",
  },
  steps: {
    proposed: "Propuesto",
    reserved: "Reservado",
    prepared: "Preparado",
    completed: "Completado",
    canceled: "Cancelado",
  },
  staffOrder: {
    unitsUnread: "No se pudieron leer las unidades disponibles.",
    sku: "SKU",
    quantity: "Cantidad",
    price: "Precio",
    units: "Unidades disponibles",
    fulfill: "Completa esta venta en Square y márcala completada aquí.",
    confirm: "Confirmar",
    markReserved: "Marcar reservado",
    markPrepared: "Marcar preparado",
    markCompleted: "Marcar completado",
    cancel: "Cancelar",
    approve: "Aprobar",
    deny: "Rechazar",
  },
  deliveryMap: {
    title: "Códigos de entrega",
    lede: "Un código se muestra cuando tiene nombre y forma. Ábrelo para permitir la entrega. Cerrarlo deja en entrega los pedidos ya hechos para ese código.",
    mapLabel: "Códigos de entrega",
    open: "Abrir {name}",
    close: "Cerrar {name}",
    unread: "No se pudieron leer los códigos de entrega.",
  },
} satisfies typeof en

const ko = {
  switchLabel: "언어",
  wholesale: "도매",
  signOut: "로그아웃",
  confirmed: "확정",
  unconfirmed: "미확정",
  pickup: "픽업",
  delivery: "배송",
  goods: "상품",
  staff: "스태프",
  colorSize: "{color}, {size} 사이즈",
  namedSku: "{name}, {color}, {size} 사이즈",
  signIn: {
    title: "로그인",
    lede: "CDA는 의류를 도매합니다. 바이어는 Square 고객 이메일로 받은 코드로 로그인합니다. 스태프는 이 앱의 비밀번호로 로그인합니다.",
    buyerEmail: "바이어 이메일",
    code: "로그인 코드",
    emailCode: "코드 보내기",
    staffEmail: "스태프 이메일",
    password: "비밀번호",
    staffSubmit: "스태프로 로그인",
    localCode: "로컬 받은편지함 코드: {code}.",
    localHint: "로컬 스태프 로그인은 staff@cda.example, 비밀번호 cda-staff입니다. 바이어 테스트 계정은 buyer@atelier.example입니다.",
  },
  nav: {
    line: "라인",
    orders: "주문",
    deliveryZips: "배송 우편번호",
    orderingCopy: "주문 문구",
  },
  failures: {
    refused: "로그인이 거절되었습니다.",
    "no-buyer": "해당 이메일의 바이어가 CDA에 없습니다.",
    "no-season": "열린 시즌이 없습니다.",
    unreadable: "읽을 수 없습니다. 저장된 내용은 없습니다.",
    "delivery-closed": "그 배송 우편번호는 닫혀 있습니다. 픽업은 계속 가능합니다.",
    "delivery-unavailable": "배송을 선택할 수 없습니다. 픽업은 계속 가능합니다.",
    "need-phone": "배송에는 전화번호가 필요합니다.",
    "empty-order": "주문에는 SKU가 하나 이상 필요합니다.",
    "bad-quantity": "수량은 양의 정수입니다.",
    "bad-time": "그 시각은 시즌이 끝난 뒤입니다.",
    "not-on-line": "그 스타일은 라인에 없습니다.",
    cutoff: "변경 마감이 지났습니다.",
    waiting: "변경 요청이 이미 대기 중입니다.",
    "not-found": "그 주문은 여기에 없습니다.",
    forbidden: "사용할 수 없습니다.",
    "cannot-switch": "주문은 픽업 또는 배송으로 유지됩니다.",
    "cannot-advance": "그 단계는 사용할 수 없습니다.",
    unconfirmed: "그 단계 전에 스태프가 주문을 확정합니다.",
    "change-waiting": "대기 중인 변경 요청이 완료를 막습니다.",
    "missing-price": "SKU에 Square 가격이 없습니다.",
    "zip-closed": "그 배송 우편번호는 열려 있지 않습니다.",
    "not-on-map": "그 우편번호는 지도에 없습니다.",
    "bad-address": "배송 주소에는 거리, 도시, 주, 우편번호, 전화번호가 필요합니다.",
  },
  line: {
    pickupAt: "픽업 장소는 {name}, {address}입니다. 시각은 {timezone} 기준입니다.",
    locationUnread: "픽업 장소를 읽을 수 없습니다.",
    empty: "라인에 스타일이 없습니다.",
    quantity: "수량",
    time: "시각",
    street: "거리",
    city: "도시",
    state: "주",
    zip: "우편번호",
    phone: "전화",
    note: "배송 메모",
    place: "주문하기",
    unread: "라인을 읽을 수 없습니다.",
  },
  orders: {
    title: "주문",
    empty: "아직 주문이 없습니다.",
    choose: "라인에서 고르세요.",
    season: "시즌",
    when: "언제",
    way: "방법",
    confirmation: "확정",
    step: "단계",
    buyer: "바이어",
    unread: "주문을 읽을 수 없습니다.",
  },
  order: {
    title: "주문",
    changeWaiting: "변경 요청이 대기 중입니다.",
    withdraw: "변경 요청 철회",
    changeTitle: "변경 요청",
    kept: "(이 주문에 유지)",
    submitChange: "변경 요청 보내기",
    deliveryCharge: "배송비",
    priceAtApproval: ", 승인 시 가격",
  },
  steps: {
    proposed: "제안",
    reserved: "예약",
    prepared: "준비",
    completed: "완료",
    canceled: "취소",
  },
  staffOrder: {
    unitsUnread: "보유 수량을 읽을 수 없습니다.",
    sku: "SKU",
    quantity: "수량",
    price: "가격",
    units: "보유 수량",
    fulfill: "이 판매는 Square에서 처리한 뒤 여기서 완료로 표시하세요.",
    confirm: "확정",
    markReserved: "예약으로 표시",
    markPrepared: "준비로 표시",
    markCompleted: "완료로 표시",
    cancel: "취소",
    approve: "승인",
    deny: "거절",
  },
  deliveryMap: {
    title: "배송 우편번호",
    lede: "이름과 영역이 있는 우편번호만 표시됩니다. 열면 배송이 가능합니다. 닫아도 이미 그 우편번호로 된 주문은 배송으로 남습니다.",
    mapLabel: "배송 우편번호",
    open: "{name} 열기",
    close: "{name} 닫기",
    unread: "배송 우편번호를 읽을 수 없습니다.",
  },
} satisfies typeof en

const copy = { en, es, ko }

export type Phrases = typeof en

export type Intros = Record<Language, string>

const locales: Record<Language, string> = {
  en: "en-US",
  es: "es-US",
  ko: "ko-KR",
}

export function phrases(language: Language): Phrases {
  return copy[language]
}

export function languageHref(url: URL, language: Language): string {
  const next = new URL(url.href)
  next.searchParams.set("lang", language)
  return `${next.pathname}${next.search}`
}

export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-z]+)\}/gi, (_, key: string) => values[key] ?? "")
}

export function introIn(language: Language, intros: Intros): string {
  const chosen = intros[language].trim()
  return chosen || intros.en
}

export function formatMoney(cents: number, language: Language): string {
  return new Intl.NumberFormat(locales[language], { style: "currency", currency: "USD" }).format(cents / 100)
}

export function formatWhen(local: string, language: Language): string {
  const [date, time] = local.split("T")
  if (!date || !time) return local
  const [year, month, day] = date.split("-").map(Number)
  if (!year || !month || !day) return local
  const formatted = new Intl.DateTimeFormat(locales[language], {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
  return `${formatted}, ${time}`
}
