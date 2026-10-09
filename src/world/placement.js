/**
 * 이벤트 → 3D 공간 배치.
 *
 * 텍스트 모드에서는 카드가 바로 뜨지만, 3D 모드에서는 이벤트가 "어딘가에서" 기다린다.
 * 사람이면 그 자리에 서 있고, 물건이면 그 물건이 빛나고, 전화면 주머니 속 폰이 울린다.
 *
 * scene : 어느 공간인가 (room · train · lobby · vip · town)
 * spot  : 그 공간 안의 지점 이름 (scenes.js 의 spots 키)
 * 'phone' spot 은 어디에 있든 E 로 받는다.
 */

// 스크립트 구간(1~3교시)은 순서가 정해져 있으니 하나하나 지정한다.
const SCRIPTED = {
  p1_00_check: ['room', 'desk'],
  p1_01_scream: ['room', 'window'],
  p1_02_storage: ['room', 'closet'],
  p1_03_sleep: ['room', 'bed'],
  p1_04_family: ['room', 'phone'],
  p1_05_sister: ['room', 'phone'],
  p1_06_lock: ['room', 'door'],
  p1_07_end: ['room', 'door'],

  p2_01_excuse: ['train', 'phone'],
  p2_02_ktx: ['train', 'seat'],
  p2_03_toilet: ['train', 'toilet'],
  p2_04_call: ['train', 'phone'],
  p2_05_station: ['lobby', 'entrance'],
  p2_06_guard: ['lobby', 'guard'],
  p2_07_lobby: ['lobby', 'clerk'],
  p2_08_up: ['lobby', 'elevator'],

  p3_01_room: ['vip', 'pb'],
  p3_02_deposit: ['vip', 'monitor'],
  p3_03_fund: ['vip', 'pb'],
  p3_04_insurance: ['vip', 'pb'],
  p3_05_realestate: ['vip', 'pb'],
  p3_06_advice: ['vip', 'pb'],
  p3_07_out: ['vip', 'exit'],
}

// 4교시(창원 동네)는 이벤트마다 지점을 지정하고, 모르는 이벤트는 아래 규칙으로 보낸다.
const TOWN = {
  p4_kmong: 'desk', p4_ai_sub: 'desk', p4_domain: 'desk', p4_chair: 'desk',
  p4_porsche: 'showroom', p4_apartment: 'realty', p4_coin: 'cafe',
  p4_parents_hospital: 'phone', p4_junior_startup: 'cafe', p4_youth_sponsor: 'plaza',
  p4_uncle_visit: 'homeDoor', p4_scam_call: 'phone', p4_quit_job: 'office',
  p4_friend_notice: 'office',

  p4x_01_stock_crash: 'phone', p4x_02_friend_betray: 'cafe', p4x_03_watch: 'mall',
  p4x_04_tax_notice: 'mailbox', p4x_05_wedding: 'mailbox', p4x_06_ex: 'phone',
  p4x_07_landlord: 'phone', p4x_08_gym_pt: 'mall', p4x_09_lawyer_friend: 'phone',
  p4x_10_car_accident: 'parking', p4x_11_bag: 'mall', p4x_12_stock_tip: 'phone',
  p4x_13_dad_business: 'phone', p4x_14_office_lunch: 'office', p4x_15_insomnia: 'bed',
  p4x_16_relative_wedding: 'plaza', p4x_17_phishing: 'phone', p4x_18_startup_own: 'desk',
  p4x_19_neighbor: 'parking', p4x_20_charity: 'mailbox', p4x_21_mother_ring: 'homeDoor',
  p4x_22_luxury_trip: 'desk', p4x_23_junior_again: 'cafe', p4x_24_health_check: 'mailbox',
  p4x_25_company_layoff: 'office', p4x_26_dating: 'cafe', p4x_27_gold: 'mall',
  p4x_28_old_boss: 'phone', p4x_29_impulse: 'desk', p4x_30_p2p: 'phone',
  p4x_31_sister_wedding: 'homeDoor', p4x_32_reunion: 'cafe', p4x_33_cafe: 'cafe',
  p4x_34_bank_call: 'bank', p4x_35_car_wash: 'parking', p4x_36_second_house: 'realty',
  p4x_37_gambling: 'plaza', p4x_38_youtube: 'desk', p4x_39_pet: 'park',
  p4x_40_bonus_scam: 'phone', p4x_41_office_gift: 'office', p4x_42_stock_alltime: 'phone',
  p4x_43_debt_friend: 'phone', p4x_44_hometown_rumor: 'plaza', p4x_45_wine: 'mall',
  p4x_46_kid_tuition: 'phone', p4x_47_burnout: 'bed', p4x_48_lease_scam: 'realty',
  p4x_49_anniversary: 'park', p4x_50_final_temptation: 'cafe',

  f_01_delivery: 'desk', f_02_taxi: 'plaza', f_03_grocery: 'mall', f_04_phone: 'desk',
  f_05_coffee: 'cafe', f_06_lotto_again: 'mall', f_07_gas: 'parking', f_08_hair: 'mall',
  f_09_umbrella: 'plaza', f_10_saving: 'phone', f_11_gift_self: 'desk', f_12_medical: 'phone',
  f_13_parents_call: 'phone', f_14_work_ot: 'office', f_15_subscription_audit: 'desk',
  f_16_night_walk: 'park', f_17_donate_small: 'plaza', f_18_old_friend_ok: 'cafe',
  f_19_insurance_call: 'phone', f_20_mirror: 'bed',

  pay_cloud_album: 'phone', pay_boss_sick: 'office', pay_boss_awol: 'office',
  pay_boss_ancestor: 'office', pay_freeze_6m: 'bank', pay_split_bank: 'bank',
  pay_insurance_y2: 'mailbox', pay_coin_hold: 'cafe', pay_uncle_repay: 'homeDoor',
  pay_cousin_ask: 'phone', pay_dog_sick: 'park', pay_partner_shield: 'cafe',
  pay_therapy_end: 'plaza', pay_drunk_text: 'bed', pay_will_tell_one: 'desk',
  pay_quit_weekday: 'park', pay_camouflage_6m: 'office',

  sp_breakdown_01: 'desk', sp_breakdown_02: 'phone', sp_breakdown_03: 'phone',
}

const BY_SPEAKER = {
  scam: 'phone', boss: 'office', junior: 'cafe', friend: 'cafe', agent: 'realty',
  dealer: 'showroom', pb: 'bank', mom: 'phone', dad: 'phone', sis: 'homeDoor',
  uncle: 'homeDoor', me: 'desk',
}

const BY_CATEGORY = {
  사치품: 'mall', 대형지출: 'realty', 투자: 'phone', 위기: 'phone', 사기: 'phone',
  회사: 'office', 소확행: 'park', 일상: 'plaza', 건강: 'bed', 가족: 'homeDoor',
}

export function placeEvent(ev) {
  if (!ev) return null
  if (SCRIPTED[ev.id]) {
    const [scene, spot] = SCRIPTED[ev.id]
    return { scene, spot }
  }
  if (ev.id.startsWith('gen_buy')) return { scene: 'town', spot: 'desk' }
  if (ev.id.startsWith('gen_')) return { scene: 'town', spot: 'phone' }
  const spot = TOWN[ev.id] ?? BY_SPEAKER[ev.speaker] ?? BY_CATEGORY[ev.category] ?? 'plaza'
  return { scene: 'town', spot }
}

/** 장면 전환 때 보여줄 장소 이름 */
export const SCENE_TITLES = {
  room: '창원시 성산구, 자취방',
  train: 'KTX 302 열차 · 6호차',
  lobby: 'NH농협은행 본점 · 1층 로비',
  vip: 'NH농협은행 본점 · 15층',
  town: '창원, 우리 동네',
}
