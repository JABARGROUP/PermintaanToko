/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT: BACKUP SUPABASE KE GOOGLE SHEET & AUTO REMINDER WHATSAPP PENDING (FONNTE)
 * =========================================================================================
 * Script ini berjalan 100% di Server Google Cloud secara otomatis 24 Jam Nonstop!
 * Tidak perlu membuka HP atau Laptop, trigger jam 18:00 (atau jam pilihan Anda) PASTI jalan.
 * 
 * ALUR PROSES:
 * 1. Jam 18:00 (atau saat trigger jalan): Membaca data Supabase 'permintaan_toko'.
 * 2. Memeriksa baris baru dan otomatis Append ke Google Sheet:
 *    - JIKA 1 SURAT MEMILIKI BANYAK BARANG/ITEM: Otomatis DIPISAH 1 BARIS PER ITEM BARANG.
 *    - Setiap baris memiliki: TYPE BARANG, NO SERI, SERI DUS, NAMA BARANG, ALASAN, QTY, dll.
 *    - Informasi No Surat, Tanggal, Toko, Area, Status, Catatan, dll. tetap sama & rapi.
 * 3. Selang jeda (Utilities.sleep 60 detik): Memfilter dokumen yang masih PENDING.
 * 4. Mengirimkan pesan rekap pengingat via WhatsApp (Fonnte API) ke Tim Service & DM terkait.
 * =========================================================================================
 */

// ================= KONFIGURASI UTAMA =================
const CONFIG = {
  // Supabase REST API Configuration
  SUPABASE_URL: 'https://vnlylgbkjmztnvjjgpjw.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_C7-RE-meqDyD8iXvp4COew_9Yhn8SWS', // Atau Service Secret Key Anda
  
  // Token Fonnte WhatsApp API (Bisa diisi manual di sini atau dibiarkan agar otomatis baca dari Supabase)
  FONNTE_TOKEN: 'PASTE_TOKEN_FONNTE_ANDA_DISINI',
  
  // Nama Sheet di Google Spreadsheet Anda
  SHEET_NAME_BACKUP: 'BACKUP_PERMINTAAN',
  
  // Link Web App Permintaan Toko
  APP_URL: 'https://jabargroup.github.io/PermintaanToko/'
};

/**
 * FUNGSI UTAMA TRIGGER HARIAN (Contoh: Jam 18:00)
 * Panggil fungsi ini di Triggers (Pemicu) Google Apps Script!
 */
function jalankanBackupDanReminderHarian() {
  Logger.log('=== MEMULAI PROSES OTOMATIS HARIAN ===');
  
  // 1. PROSES BACKUP DATA SUPABASE KE GOOGLE SHEET (1 BARIS PER ITEM BARANG)
  try {
    const backupResult = backupSupabaseToGoogleSheet();
    Logger.log('Hasil Backup: ' + JSON.stringify(backupResult));
  } catch (err) {
    Logger.log('Error saat Backup: ' + err.message);
  }
  
  // 2. JEDA 60 DETIK (1 MENIT) SESUAI PERMINTAAN
  Logger.log('Menunggu 60 detik sebelum menjalankan Reminder WA...');
  Utilities.sleep(60000); 
  
  // 3. PROSES CEK DOKUMEN PENDING & KIRIM WHATSAPP KE SERVICE & DM
  try {
    const reminderResult = kirimReminderWAPendingSupabase();
    Logger.log('Hasil Reminder WA: ' + JSON.stringify(reminderResult));
  } catch (err) {
    Logger.log('Error saat Reminder WA: ' + err.message);
  }
  
  Logger.log('=== SELESAI SELURUH PROSES OTOMATIS HARIAN ===');
}

/**
 * BAGIAN 1: BACKUP DOKUMEN SUPABASE KE GOOGLE SHEET (DIPISAH 1 BARIS PER ITEM LENGKAP)
 */
function backupSupabaseToGoogleSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME_BACKUP);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME_BACKUP);
  }
  
  // Definisi Header Kolom Lengkap & Rapi Terpisah
  const headers = [
    'NO SURAT',
    'TANGGAL',
    'TOKO',
    'AREA',
    'JENIS PERMINTAAN',
    'STATUS SURAT',
    'SERVICE APPROVAL',
    'ITEM KE',
    'TYPE BARANG',
    'NO SERI',
    'SERI DUS',
    'NAMA BARANG / PERMINTAAN',
    'ALASAN PERMINTAAN',
    'QTY',
    'SATUAN',
    'STATUS / NO PART (SERVICE)',
    'CATATAN TOKO',
    'DIBUAT OLEH',
    'WAKTU BACKUP (WIB)'
  ];
  
  // Buat Header jika sheet masih kosong
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    
    // Styling Header
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#0284c7');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  }
  
  // Ambil daftar No Surat yang sudah ada di Sheet agar tidak duplikat
  const existingNoSuratSet = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    values.forEach(row => {
      if (row[0]) existingNoSuratSet.add(String(row[0]).trim());
    });
  }
  
  // Fetch data dari Supabase table 'permintaan_toko'
  const url = CONFIG.SUPABASE_URL + '/rest/v1/permintaan_toko?select=*&order=created_at.asc';
  const options = {
    method: 'GET',
    headers: {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    throw new Error('Gagal fetch Supabase permintaan_toko: ' + response.getContentText());
  }
  
  const allRows = JSON.parse(response.getContentText());
  if (!Array.isArray(allRows)) {
    return { count: 0, message: 'Format data Supabase bukan array' };
  }
  
  const rowsToInsert = [];
  const nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  
  allRows.forEach(item => {
    const noSurat = String(item.no_surat || item.noSurat || '').trim();
    if (!noSurat || noSurat.startsWith('__SYSTEM_')) return;
    
    // Jika No Surat ini belum pernah masuk Google Sheet, kita proses
    if (!existingNoSuratSet.has(noSurat)) {
      // 1. Parse items / daftar barang
      let itemsList = [];
      if (typeof item.items === 'string') {
        try { itemsList = JSON.parse(item.items); } catch(e) {}
      } else if (Array.isArray(item.items)) {
        itemsList = item.items;
      }
      
      const srvApproveStr = (item.service_approve === true || item.serviceApprove === true) ? 'SUDAH APPROVE' : 'BELUM APPROVE';
      const tglStr = item.tanggal || '-';
      const tokoStr = item.toko || '-';
      const areaStr = item.area || 'ALL';
      const jenisStr = item.jenis || 'REGULER';
      const statusStr = item.status || 'PENDING';
      const catatanStr = item.catatan || '-';
      const createdByStr = item.created_by || item.createdBy || '-';
      
      // 2. JIKA ADA BANYAK ITEM: PISAH 1 BARIS PER ITEM LENGKAP
      if (Array.isArray(itemsList) && itemsList.length > 0) {
        itemsList.forEach((it, idx) => {
          // Ekstraksi field item sesuai struktur aplikasi
          const typeBarang = it.type || it.typeBarang || it.jenis || '-';
          const noSeri = it.seri || it.noSeri || it.kodeSeri || '-';
          const seriDus = it.dus || it.seriDus || it.dusBarang || it.snDus || '-';
          const namaBarang = it.barang || it.namaBarang || it.permintaan || it.nama || '-';
          const alasan = it.alasan || it.alasanPermintaan || it.keterangan || it.ket || '-';
          const qty = Number(it.qty || it.jumlah || 1);
          const satuan = it.satuan || 'Pcs';
          const partInfo = it.statusPart || it.noPart || it.keteranganPart || '-';
          
          rowsToInsert.push([
            noSurat,
            tglStr,
            tokoStr,
            areaStr,
            jenisStr,
            statusStr,
            srvApproveStr,
            idx + 1,        // Item Ke-
            typeBarang,     // TYPE BARANG
            noSeri,         // NO SERI
            seriDus,        // SERI DUS
            namaBarang,     // NAMA BARANG
            alasan,         // ALASAN
            qty,            // QTY
            satuan,         // SATUAN
            partInfo,       // STATUS / NO PART
            catatanStr,
            createdByStr,
            nowStr
          ]);
        });
      } else {
        // Jika tidak ada rincian item (misal pengajuan umum)
        rowsToInsert.push([
          noSurat,
          tglStr,
          tokoStr,
          areaStr,
          jenisStr,
          statusStr,
          srvApproveStr,
          1,
          '-',
          '-',
          '-',
          '-',
          '-',
          1,
          'Pcs',
          '-',
          catatanStr,
          createdByStr,
          nowStr
        ]);
      }
      
      existingNoSuratSet.add(noSurat);
    }
  });
  
  if (rowsToInsert.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
    
    // Auto-fit kolom agar tampilan sangat rapi
    for (let c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
    }
  }
  
  return {
    success: true,
    addedRowsCount: rowsToInsert.length,
    totalSuratCount: allRows.length
  };
}

/**
 * BAGIAN 2: CEK STATUS PENDING & KIRIM WHATSAPP VIA FONNTE
 */
function kirimReminderWAPendingSupabase() {
  // 1. Ambil Token Fonnte
  let fonnteToken = CONFIG.FONNTE_TOKEN;
  if (!fonnteToken || fonnteToken.includes('PASTE_TOKEN')) {
    fonnteToken = fetchTokenFromSupabaseLookup();
  }
  
  if (!fonnteToken) {
    Logger.log('⚠️ TOKEN FONNTE KOSONG! Harap isi CONFIG.FONNTE_TOKEN di bagian atas script.');
    return { success: false, error: 'Token Fonnte belum diisi.' };
  }
  
  // 2. Ambil Semua Data Permintaan dari Supabase
  const reqUrl = CONFIG.SUPABASE_URL + '/rest/v1/permintaan_toko?select=*';
  const reqOptions = {
    method: 'GET',
    headers: {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY
    },
    muteHttpExceptions: true
  };
  const reqResponse = UrlFetchApp.fetch(reqUrl, reqOptions);
  if (reqResponse.getResponseCode() !== 200) {
    return { success: false, error: 'Gagal query Supabase permintaan_toko' };
  }
  const allRequests = JSON.parse(reqResponse.getContentText());
  
  // 3. Ambil Semua User dari Supabase (untuk nomor WA)
  const userUrl = CONFIG.SUPABASE_URL + '/rest/v1/users?select=*';
  const userResponse = UrlFetchApp.fetch(userUrl, reqOptions);
  let allUsers = [];
  if (userResponse.getResponseCode() === 200) {
    allUsers = JSON.parse(userResponse.getContentText());
  }
  
  // Filter Dokumen Pending
  const isIgnored = (r) => {
    if (!r || !r.no_surat || String(r.no_surat).startsWith('__SYSTEM_')) return true;
    const st = String(r.status || '').trim().toUpperCase();
    return st === 'BATAL' || st === 'REJECT' || st === 'DITOLAK';
  };
  const isDone = (r) => String(r.status || '').trim().toUpperCase() === 'DONE';
  const isDMApproved = (r) => {
    const st = String(r.status || '').trim().toUpperCase();
    return st === 'APPROVE' || isDone(r);
  };
  const isServiceApproved = (r) => {
    const st = String(r.status || '').trim().toUpperCase();
    if (st.includes('DM') || st === 'APPROVE' || st === 'DONE') return true;
    return r.service_approve === true || r.serviceApprove === true;
  };
  
  const pendingService = allRequests.filter(r => !isIgnored(r) && !isDone(r) && !isDMApproved(r) && !isServiceApproved(r));
  const pendingDM = allRequests.filter(r => !isIgnored(r) && !isDone(r) && !isDMApproved(r) && isServiceApproved(r));
  
  Logger.log(`Status Pending: Service = ${pendingService.length}, DM = ${pendingDM.length}`);
  
  if (pendingService.length === 0 && pendingDM.length === 0) {
    Logger.log('ℹ️ Tidak ada dokumen berstatus PENDING saat ini.');
    return { success: true, message: 'Tidak ada dokumen pending.' };
  }
  
  let totalTerkirim = 0;
  
  // A. KIRIM REKAP PENDING KE USER SERVICE
  if (pendingService.length > 0) {
    const serviceUsers = allUsers.filter(u => {
      const cat = String(u.category || u.role || '').trim().toUpperCase();
      return cat === 'SERVICE' || cat === 'HODS' || cat.includes('SERVICE');
    });
    
    serviceUsers.forEach(srv => {
      const phone = cleanPhoneNumber(srv.phone || srv.no_hp || srv.whatsapp);
      if (!phone) return;
      
      const srvArea = String(srv.area || 'ALL').trim().toUpperCase();
      const userReqs = pendingService.filter(r => {
        const rArea = String(r.area || '').trim().toUpperCase();
        if (srvArea === 'ALL' || srvArea === 'SEMUA' || !srvArea || srvArea === '-') return true;
        if (!rArea || rArea === 'ALL' || rArea === 'SEMUA' || rArea === '-') return true;
        return srvArea === rArea;
      });
      
      if (userReqs.length > 0) {
        const srvName = srv.full_name || srv.fullName || srv.username || 'Tim Service';
        const itemsStr = userReqs.map((r, idx) => `${idx + 1}. No Surat: ${r.no_surat} (Toko: ${r.toko || '-'})`).join('\n');
        
        const pesan = 
          `Kepada Yth. Bapak/Ibu ${srvName},\n\n` +
          `Berikut No surat permintaan menunggu approval anda:\n` +
          `${itemsStr}\n\n` +
          `${CONFIG.APP_URL}\n\n` +
          `Terima kasih.`;
          
        const res = kirimPesanFonnte(fonnteToken, phone, pesan);
        if (res.status === true) totalTerkirim++;
      }
    });
  }
  
  // B. KIRIM REKAP PENDING KE USER DM
  if (pendingDM.length > 0) {
    const dmUsers = allUsers.filter(u => {
      const cat = String(u.category || u.role || '').trim().toUpperCase();
      return cat === 'DM' || cat.includes('DM') || cat.includes('DISTRICT');
    });
    
    dmUsers.forEach(dm => {
      const phone = cleanPhoneNumber(dm.phone || dm.no_hp || dm.whatsapp);
      if (!phone) return;
      
      const dmArea = String(dm.area || 'ALL').trim().toUpperCase();
      const userReqs = pendingDM.filter(r => {
        const rArea = String(r.area || '').trim().toUpperCase();
        if (dmArea === 'ALL' || dmArea === 'SEMUA' || !dmArea || dmArea === '-') return true;
        if (!rArea || rArea === 'ALL' || rArea === 'SEMUA' || rArea === '-') return true;
        return dmArea === rArea;
      });
      
      if (userReqs.length > 0) {
        const dmName = dm.full_name || dm.fullName || dm.username || 'DM';
        const itemsStr = userReqs.map((r, idx) => `${idx + 1}. No Surat: ${r.no_surat} (Toko: ${r.toko || '-'})`).join('\n');
        
        const pesan = 
          `Kepada Yth. Bapak/Ibu ${dmName},\n\n` +
          `Berikut No surat permintaan menunggu approval anda:\n` +
          `${itemsStr}\n\n` +
          `${CONFIG.APP_URL}\n\n` +
          `Terima kasih.`;
          
        const res = kirimPesanFonnte(fonnteToken, phone, pesan);
        if (res.status === true) totalTerkirim++;
      }
    });
  }
  
  return {
    success: true,
    totalPesanTerkirim: totalTerkirim,
    pendingServiceCount: pendingService.length,
    pendingDMCount: pendingDM.length
  };
}

/**
 * HELPER: KIRIM REQUEST KE API FONNTE
 */
function kirimPesanFonnte(token, target, message) {
  const url = 'https://api.fonnte.com/send';
  const payload = {
    target: target,
    message: message,
    countryCode: '62'
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': token.trim()
    },
    payload: payload,
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    Logger.log(`[FONNTE RESPONSE to ${target}]: ` + response.getContentText());
    return result;
  } catch (err) {
    Logger.log(`[FONNTE ERROR to ${target}]: ` + err.message);
    return { status: false, error: err.message };
  }
}

/**
 * HELPER: BERSIHKAN FORMAT NOMOR TELEPON
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/[^0-9]/g, '');
  if (!clean || clean.length < 5) return '';
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (!clean.startsWith('62')) {
    clean = '62' + clean;
  }
  return clean;
}

/**
 * HELPER: AMBIL TOKEN FONNTE DARI SUPABASE LOOKUP
 */
function fetchTokenFromSupabaseLookup() {
  try {
    const url = CONFIG.SUPABASE_URL + '/rest/v1/lookup?key=eq.fonteToken&select=value';
    const options = {
      method: 'GET',
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + CONFIG.SUPABASE_ANON_KEY
      },
      muteHttpExceptions: true
    };
    const res = UrlFetchApp.fetch(url, options);
    if (res.getResponseCode() === 200) {
      const arr = JSON.parse(res.getContentText());
      if (Array.isArray(arr) && arr.length > 0 && arr[0].value) {
        return String(arr[0].value).trim();
      }
    }
  } catch(e) {
    Logger.log('Notice: Tidak dapat mengambil token dari Supabase lookup: ' + e.message);
  }
  return '';
}

/**
 * PASANG TRIGGER OTOMATIS JAM 18:00 WIB (CUKUP DIJALANKAN SEKALI)
 */
function pasangTriggerJam18Otomatis() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'jalankanBackupDanReminderHarian') {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  ScriptApp.newTrigger('jalankanBackupDanReminderHarian')
    .timeBased()
    .everyDays(1)
    .atHour(18)
    .inTimezone('Asia/Jakarta')
    .create();
    
  Logger.log('✅ Trigger Otomatis Jam 18:00 WIB Berhasil Dipasang!');
}
