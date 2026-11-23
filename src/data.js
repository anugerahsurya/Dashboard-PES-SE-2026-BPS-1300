// Urutan, target tetap, jumlah petugas, dan tenggat mengikuti lembar "14_11 14.00".
// Kode wilayah adalah kunci penggabungan ketiga ekspor.
const regions = [
  ['1303', 'Kab. Solok', 27, 23, 21, 3, 27],
  ['1306', 'Kab. Padang Pariaman', 29, 29, 22, 4, 25],
  ['1307', 'Kab. Agam', 28, 28, 21, 4, 23],
  ['1309', 'Kab. Pasaman', 23, 26, 20, 4, 23],
  ['1312', 'Kab. Pasaman Barat', 29, 27, 21, 4, 25],
  ['1371', 'Kota Padang', 34, 44, 13, 6, 27],
  ['1372', 'Kota Solok', 23, 25, 16, 4, 27],
  ['1375', 'Kota Bukittinggi', 26, 24, 16, 3, 27],
  ['1376', 'Kota Payakumbuh', 25, 24, 13, 3, 25],
]

const slsColumns = { belum: 'belum', sedang: 'sedang', selesai: 'selesai' }
const assignmentColumns = {
  open: 'open',
  draft: 'draft',
  'submitted by pencacah': 'submitted',
  'completed by pengawas': 'completed',
  'approved by pengawas': 'approved',
  'edited by admin kabupaten': 'editedByAdmin',
  'completed by admin kabupaten': 'completedByAdmin',
  'rejected by pengawas': 'rejected',
  'rejected by admin kabupaten': 'rejectedByAdmin',
  'revoked by pengawas': 'revoked',
}

function readRows(source, label) {
  const text = String(source ?? '').replace(/^\uFEFF/, '').trim()
  const header = text.split(/\r?\n|\r/, 1)[0]
  const delimiter = [',', ';', '\t'].sort((a, b) => header.split(b).length - header.split(a).length)[0]
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  let closed = false
  function finishCell() {
    row.push(cell.trim())
    cell = ''
    closed = false
  }
  function finishRow() {
    finishCell()
    if (row.some(Boolean)) rows.push(row)
    row = []
  }
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char !== '"') cell += char
      else if (text[i + 1] === '"') { cell += '"'; i++ }
      else { quoted = false; closed = true }
    } else if (char === delimiter) {
      finishCell()
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      finishRow()
    } else if (char === '"' && !cell && !closed) {
      quoted = true
    } else {
      if (char === '"' || (closed && char.trim())) throw new Error(label + ': penanda kutip CSV tidak valid.')
      cell += char
    }
  }
  if (quoted) throw new Error(label + ': penanda kutip CSV belum ditutup.')
  finishRow()
  return rows
}

function readCounts(source, isSls, label) {
  const [header, ...rows] = readRows(source, label)
  if (!header || !rows.length) throw new Error(label + ': CSV kosong atau tidak memiliki baris data.')
  const columns = isSls ? slsColumns : assignmentColumns
  const idHeader = isSls ? 'level_2_full_code' : 'wilayah'
  const names = header.map(name => name.toLowerCase().replace(/\s+/g, ' '))
  const idIndex = names.indexOf(idHeader)
  if (idIndex < 0 || names.length < 2) throw new Error(label + ': periksa kolom kode wilayah dan status.')
  if (new Set(names).size !== names.length) throw new Error(label + ': terdapat judul kolom ganda.')
  for (const name of names) {
    if (name !== idHeader && !Object.hasOwn(columns, name)) throw new Error(label + ': kolom tidak dikenal "' + name + '".')
  }
  const counts = new Map()
  for (const [i, row] of rows.entries()) {
    if (row.length !== names.length) throw new Error(label + ': jumlah kolom pada baris ' + (i + 2) + ' tidak sesuai.')
    const code = row[idIndex]
    if (!regions.some(([id]) => id === code)) throw new Error(label + ': kode wilayah tidak dikenal "' + code + '".')
    if (counts.has(code)) throw new Error(label + ': kode ' + code + ' muncul lebih dari sekali.')
    const values = Object.fromEntries(Object.values(columns).map(key => [key, 0]))
    for (const [index, value] of row.entries()) {
      if (index === idIndex) continue
      const n = Number(value)
      if (value && (!/^\d+(?:\.0+)?$/.test(value) || !Number.isSafeInteger(n))) {
        throw new Error(label + ': nilai "' + value + '" pada ' + code + ', kolom ' + header[index] + ' tidak valid.')
      }
      values[columns[names[index]]] = n
    }
    counts.set(code, values)
  }
  const missing = regions.filter(([id]) => !counts.has(id)).map(([id]) => id)
  if (missing.length) throw new Error(label + ': data wilayah ' + missing.join(', ') + ' belum tersedia.')
  return counts
}

function readKp(source) {
  const [header, ...rows] = readRows(source, '#KP')
  if (!header || !rows.length) throw new Error('#KP: CSV kosong.')
  const names = header.map(value => value.toLowerCase().replace(/\s+/g, ' '))
  const codeIndex = names.indexOf('wilayah')
  const kpIndex = names.indexOf('total_assg_ada_kp')
  const statusIndex = names.indexOf('assignment_status_alias')
  if (codeIndex < 0 || kpIndex < 0 || new Set(names).size !== names.length) {
    throw new Error('#KP: perlu kolom Wilayah dan TOTAL_ASSG_ADA_KP yang unik.')
  }
  const result = new Map()
  for (const row of rows) {
    const code = row[codeIndex]
    const raw = row[kpIndex]
    const value = Number(raw)
    const label = statusIndex === -1 ? 'draft' : row[statusIndex]?.toLowerCase().replace(/\s+/g, ' ')
    if (row.length !== header.length || !regions.some(([id]) => id === code)) throw new Error('#KP: baris atau kode wilayah tidak valid.')
    if (!Object.hasOwn(assignmentColumns, label)) throw new Error('#KP ' + code + ': status tidak dikenal: ' + (label || '(kosong)'))
    if (!raw || !/^\d+(?:\.0+)?$/.test(raw) || !Number.isSafeInteger(value)) throw new Error('#KP: jumlah assignment harus bilangan bulat nonnegatif.')
    if (!result.has(code)) result.set(code, new Map())
    const statuses = result.get(code)
    const status = assignmentColumns[label]
    if (statuses.has(status)) throw new Error('#KP ' + code + ': status duplikat: ' + label)
    statuses.set(status, value)
  }
  if (result.size !== regions.length) throw new Error('#KP: sembilan wilayah harus tersedia.')
  return result
}

function sumNumbers(values) {
  const result = values.reduce((sum, value) => sum + value, 0)
  if (!Number.isSafeInteger(result)) throw new Error('Jumlah melampaui batas bilangan bulat yang dapat disimpan.')
  return result
}

function assignment(status, officers) {
  const target = sumNumbers(Object.values(status))
  const pml = status.completed + status.completedByAdmin + status.editedByAdmin + status.approved + status.rejected + status.rejectedByAdmin + status.revoked
  return { ...status, target, officers, ppl: pml + status.submitted, pml, final: status.completed + status.completedByAdmin + status.approved }
}

export function buildSnapshot({ sls, nonUb, ub, kp }, date, time) {
  const stamp = new Date(date + 'T00:00:00Z')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(stamp.getTime()) || stamp.toISOString().slice(0, 10) !== date) {
    throw new Error('Tanggal laporan tidak valid.')
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Jam laporan harus dalam format HH:mm WIB.')
  const kpCounts=readKp(kp);
  const slsCounts = readCounts(sls, true, 'SLS')
  const nonUbCounts = readCounts(nonUb, false, 'PES SE2026')
  const ubCounts = readCounts(ub, false, 'PES SE2026 UB')
  const sameAssignments = regions.every(([code]) =>
    Object.values(assignmentColumns).every(key => nonUbCounts.get(code)[key] === ubCounts.get(code)[key])
  )
  if (sameAssignments) throw new Error('Data PES SE2026 dan PES SE2026 UB identik. Periksa kembali kedua file.')
  const rows = regions.map(([code, name, slsTarget, ubTarget, nonUbOfficers, ubOfficers, day]) => {
    const counts = slsCounts.get(code)
    const ubStatus = { ...ubCounts.get(code) }
    const kpByStatus = kpCounts.get(code)
    const finalStatuses = ['completed', 'completedByAdmin', 'approved']
    let kpAlreadyFinal = 0
    let moved = 0
    for (const [status, count] of kpByStatus) {
      if (count > ubStatus[status]) {
        throw new Error('#KP ' + name + ': KP melebihi jumlah status ' + status + ' pada CSV UB. Periksa waktu ekspor kedua berkas.')
      }
      if (finalStatuses.includes(status)) {
        kpAlreadyFinal += count
      } else {
        ubStatus[status] -= count
        moved += count
      }
    }
    const ubData = assignment(ubStatus, ubOfficers)
    ubData.kp = moved + kpAlreadyFinal
    ubData.kpAlreadyFinal = kpAlreadyFinal
    ubData.kpFromDraft = kpByStatus.get('draft') ?? 0
    ubData.target += moved
    ubData.ppl += moved
    ubData.pml += moved
    ubData.final += moved
    if (sumNumbers(Object.values(counts)) !== slsTarget) throw new Error('SLS ' + name + ': jumlah status harus sesuai target ' + slsTarget + '.')
    if (ubData.target !== ubTarget) throw new Error('UB ' + name + ': jumlah status harus sesuai target ' + ubTarget + '. Periksa pilihan file UB.')
    return {
      code, name, deadline: '2026-11-' + day,
      sls: { ...counts, target: slsTarget },
      nonUb: assignment(nonUbCounts.get(code), nonUbOfficers),
      ub: ubData,
    }
  })
  const totals = {}
  for (const group of ['sls', 'nonUb', 'ub']) {
    totals[group] = {}
    for (const key of Object.keys(rows[0][group])) {
      totals[group][key] = sumNumbers(rows.map(row => row[group][key]))
    }
  }
  return { date, time, rows, totals }
}
