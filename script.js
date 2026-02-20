// =====================
// ELEMENT
// =====================
const provSelect = document.getElementById("provinsiSelect");
const tahunJateng = document.getElementById("tahunJateng");
const variabelSelectSemarang = document.getElementById("variabelSelectSemarang");


let dataNas = [];
let dataJateng = [];

let lineChart, barDistribusiChart, barChart;
let geoLayer;

let faskesReady = false;
let longlatReady = false;

// =====================
// LOAD DATA NASIONAL
// =====================
Papa.parse("nasional.csv", {
  download: true,
  header: true,
  delimiter: ";",
  complete: res => {
  dataNas = res.data.filter(d => d.PROVINSI);
  isiProvinsi();
  updateLine();
  updateDistribusi();
  updateKPINasional(); // <<< ganti ini
  loadMapLayer();
}

});

// =====================
// LOAD DATA JATENG
// =====================
let barJatengChart;

// LOAD JATENG CSV
Papa.parse("jateng.csv", {
  download:true,
  header:true,
  delimiter:";",
  complete: res=>{
    dataJateng = res.data.filter(d => d["Kab/Kota"]);

    console.log("DATA JATENG:", dataJateng); // <<< TAMBAH DI SINI

    isiTahunJateng();
    buatBarJateng();
  }
});

// =====================
// LOAD DATA SEMARANG
// =====================
let geoLayerSemarang, layerPendudukSemarang, layerFaskesSemarang, layerControlSemarang;
let dataFaskes = [];
let dataPenduduk = [];

Papa.parse("data_faskes_longlat.csv", {
  download:true,
  header:true,
  delimiter:";",
  complete: res=>{  
    dataFaskes = res.data.filter(d => d.Kecamatan);

    faskesReady = true;
    tryInitSemarang(); // 🔥 penting
  }
});

Papa.parse("penduduk_semarang.csv", {
  download:true,
  header:true,  
  delimiter:";",
  complete: res=>{
    dataPenduduk = res.data.filter(d => d.Kecamatan);
    loadPendudukSemarang();
  }
});

let dataLonglat = [];

Papa.parse("longlat.csv", {
  download:true,
  header:true,
  delimiter:";",
  complete: res=>{
    dataLonglat = res.data.filter(d => d.Faskes);

    longlatReady = true;
    tryInitSemarang(); // 🔥 penting
  }
});

function normalizeKab(str){
  return (str || "")
    .toUpperCase()
    .replace(/\./g, "")      // hapus titik saja
    .trim();
}

function isiTahunJateng(){
  const tahunSet = [...new Set(dataJateng.map(d => d.Tahun))];
  tahunJateng.innerHTML = "";
  tahunSet.forEach(t=>{
    tahunJateng.innerHTML += `<option value="${t}">${t}</option>`;
  });
}

function buatBarJateng(){

  const th = String(tahunJateng.value);

  const rows = dataJateng.filter(d =>
    String(d.Tahun) === th
  );

  const map = {};

  rows.forEach(r=>{
    const k = r["Kab/Kota"];
    const val = toNumber(r.Kasus);
    map[k] = (map[k]||0) + val;
  });

  if(barJatengChart) barJatengChart.destroy();

  barJatengChart = new Chart(
    document.getElementById("barJateng"),
    {
      type:"bar",
      data:{
        labels:Object.keys(map),
        datasets:[{
          label:"Kasus Dengue",
          data:Object.values(map),
          backgroundColor:"#66bb6a"
        }]
      },
      options:{ responsive:true }
    }
  );
}

// =====================
// DROPDOWN PROVINSI
// =====================
function isiProvinsi() {
  const prov = [...new Set(dataNas.map(d => d.PROVINSI))];
  provSelect.innerHTML = `<option value="INDONESIA">INDONESIA</option>`;
  prov.forEach(p => provSelect.innerHTML += `<option>${p}</option>`);
}

// =====================
// KPI nasional
// =====================
function updateKPINasional(){

  const prov = provSelect.value;

  let rows;

  if(prov === "INDONESIA"){
    rows = dataNas;
  } else {
    rows = dataNas.filter(d => d.PROVINSI === prov);
  }

  let total = 0;

  rows.forEach(d=>{
    total += toNumber(d.Kasus);
  });

  const avg = Math.round(total / rows.length);

  // YANG BERUBAH CUMA INI
  document.getElementById("kpiTotal").innerText =
    total.toLocaleString("id-ID");

  document.getElementById("kpiAvg").innerText =
    avg.toLocaleString("id-ID");
}


// =====================
// KPI JATENG
// =====================
function updateKPIJateng(){

  const th = String(tahunJateng.value);

  const rows = dataJateng.filter(d =>
    String(d.Tahun) === th
  );

  let total = 0;
  let mapKab = {};

  rows.forEach(r=>{
    const val = toNumber(r.Kasus);
    total += val;

    const kab = r["Kab/Kota"];
    mapKab[kab] = (mapKab[kab] || 0) + val;
  });

  // cari kab/kota tertinggi
  const kabTertinggi = Object.entries(mapKab)
    .sort((a,b)=>b[1]-a[1])[0][0];

  const avg = Math.round(total / rows.length);

  document.getElementById("kpiTotal").innerText =
    total.toLocaleString("id-ID");

  document.getElementById("kpiProv").innerText =
    kabTertinggi;

  document.getElementById("kpiAvg").innerText =
    avg.toLocaleString("id-ID");
}

// =====================
// KPI SEMARANG
function updateKPISemarang(){

  const tahun = document.getElementById("tahunSemarang").value;

  const rows = dataFaskes.filter(d =>
    String(d.Tahun).trim() === tahun
  );

  let total = 0;
  const mapKec = {};

  rows.forEach(d=>{
    const kec = d.Kecamatan?.trim().toUpperCase();
    const val = Number(d.Kasus) || 0;

    total += val;

    if(kec)
      mapKec[kec] = (mapKec[kec] || 0) + val;
  });

  // kecamatan tertinggi
  let wilayahTertinggi = "-";
  if(Object.keys(mapKec).length){
    wilayahTertinggi = Object.entries(mapKec)
      .sort((a,b)=>b[1]-a[1])[0][0];
  }

  const avg = rows.length ? Math.round(total / rows.length) : 0;

  document.getElementById("kpiTotal").innerText =
    total.toLocaleString("id-ID");

  document.getElementById("kpiProv").innerText =
    wilayahTertinggi;

  document.getElementById("kpiAvg").innerText =
    avg.toLocaleString("id-ID");
}

// =====================
// LINE NASIONAL
// =====================
function updateLine() {

  const prov = provSelect.value;
  let rows = prov === "INDONESIA"
    ? dataNas
    : dataNas.filter(d => d.PROVINSI == prov);

  const years = [...new Set(rows.map(d => d.Tahun))];
  const mingguMax = Math.max(...rows.map(d => Number(d.Minggu)));

  const datasets = years.map(th => {
    const arr = Array(mingguMax).fill(0);

    rows.filter(r => r.Tahun == th).forEach(r => {
      arr[r.Minggu - 1] +=
        Number(String(r.Kasus).replace(/\./g,'')) || 0;
    });

    return { label: th, data: arr, fill:false, tension:0.3 };
  });

  if (lineChart) lineChart.destroy();

  lineChart = new Chart(
    document.getElementById("lineNas"),
    {
      type:"line",
      data:{
        labels:Array.from({length:mingguMax},(_,i)=>i+1),
        datasets
      },
      options:{ responsive:true }
    }
  );

  // <<< TAMBAHKAN DI SINI
  updateKPINasional();
}

function updateDistribusi() {

  const th = document.getElementById("tahunDistribusi").value;
  const map = {};

  dataNas.forEach(d=>{
    if(!d.PROVINSI || !d.Kasus) return;
    if(th !== "ALL" && d.Tahun != th) return;

    const prov = d.PROVINSI.trim().toUpperCase();
    const val = Number(String(d.Kasus).replace(/\./g,'')) || 0;

    map[prov] = (map[prov]||0)+val;
  });

  // ===== KPI WILAYAH TERTINGGI =====
  let wilayahTertinggi = "-";

  if(Object.keys(map).length > 0){
    wilayahTertinggi = Object.entries(map)
      .sort((a,b)=>b[1]-a[1])[0][0];
  }

  document.getElementById("kpiProv").innerText = wilayahTertinggi;

  // ===== CHART =====
  if(barDistribusiChart) barDistribusiChart.destroy();

  barDistribusiChart = new Chart(
    document.getElementById("barDistribusi"),
    {
      type:"bar",
      data:{
        labels:Object.keys(map),
        datasets:[{
          label:"Kasus Dengue",
          data:Object.values(map),
          backgroundColor:"#2e7d32"
        }]
      },
      options:{ responsive:true }
    }
  );
}

// =====================
// BAR JATENG
// =====================
function updateBarJateng() {

  if (!dataJateng.length) return;

  const th = tahunJateng.value || "2023"; // default
  const rows = dataJateng.filter(d => d.Tahun == th);

  const map = {};

  rows.forEach(r=>{
    const k = r["Kab/Kota"];
    const val = Number(String(r.Kasus).replace(/\./g,'')) || 0;
    map[k] = (map[k]||0)+val;
  });

  if (barChart) barChart.destroy();

  barChart = new Chart(document.getElementById("barJateng"),{
    type:"bar",
    data:{
      labels:Object.keys(map),
      datasets:[{
        data:Object.values(map),
        backgroundColor:"#66bb6a"
      }]
    },
    options:{ responsive:true }
  });
}

// =====================
// DATA JATENG ANALISIS
// =====================
function totalPerKabJateng(tahunFilter){
  const mapKab = {};

  dataJateng.forEach(d=>{
    if(!d["Kab/Kota"] || !d.Kasus) return;
    if(tahunFilter && d.Tahun != tahunFilter) return;

    const kab = normalizeKab(d["Kab/Kota"]);

    const val = toNumber(d.Kasus);

    mapKab[kab] = (mapKab[kab] || 0) + val;
  });

  return mapKab;
}
function toNumber(val){
  return Number(
    String(val)
      .replace(/\./g,'')
      .replace(',', '.')
  ) || 0;
}

let dataAnalisis = [];
let lineSemarangChart, scatterSemarangChart;

Papa.parse("hujan_mingguan.csv", {
  download:true,
  header:true,
  delimiter:";",
  complete: res=>{
    dataAnalisis = res.data;
    buatAnalisisSemarang();
  }
});

function korelasi(x,y){
  const n=x.length;
  const sumX=x.reduce((a,b)=>a+b,0);
  const sumY=y.reduce((a,b)=>a+b,0);
  const sumXY=x.reduce((a,b,i)=>a+b*y[i],0);
  const sumX2=x.reduce((a,b)=>a+b*b,0);
  const sumY2=y.reduce((a,b)=>a+b*b,0);
  return (n*sumXY-sumX*sumY) /
  Math.sqrt((n*sumX2-sumX**2)*(n*sumY2-sumY**2));
}

function zScore(arr){
  const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
  const std = Math.sqrt(arr.map(x=>(x-mean)**2).reduce((a,b)=>a+b)/arr.length);
  return arr.map(x=>(x-mean)/std);
}

function buatAnalisisSemarang(){

  const minggu = dataAnalisis.map(d=>d.minggu);
  const hujan  = dataAnalisis.map(d=>toNumber(d.total_hujan));
  const suhu   = dataAnalisis.map(d=>toNumber(d.total_temperatur));
  const lembap = dataAnalisis.map(d=>toNumber(d.total_kelembapan));
  const kasus  = dataAnalisis.map(d=>toNumber(d.kasus));

  // PILIH VARIABEL
  const pilihan = variabelSelectSemarang.value;
  let variabelArr = hujan;
let namaVar = "Curah Hujan";

if(pilihan === "suhu"){
  variabelArr = suhu;
  namaVar = "Suhu Udara";
}
else if(pilihan === "lembap"){
  variabelArr = lembap;
  namaVar = "Kelembapan Udara";
}

  if(lineSemarangChart) lineSemarangChart.destroy();

  lineSemarangChart = new Chart(
    document.getElementById("lineSemarang"),
    {
      type:"line",
      data:{
        labels:minggu,
        datasets:[
 {label:"Kasus Dengue", data:zScore(kasus), borderColor:"red"},
 {label:"Curah Hujan", data:zScore(hujan), borderColor:"blue"},
 {label:"Suhu", data:zScore(suhu), borderColor:"orange"},
 {label:"Kelembapan", data:zScore(lembap), borderColor:"green"}
]
      },
      options:{
        responsive:true,
        interaction:{mode:'index', intersect:false}
      }
    }
  );

  // SCATTER
  if(scatterSemarangChart) scatterSemarangChart.destroy();

scatterSemarangChart = new Chart(
  document.getElementById("scatterSemarang"),
  {
    type:"scatter",
    data:{
      datasets:[{
        label:"Variabel vs Kasus",
        data: variabelArr.map((v,i)=>({
          x:v,
          y:kasus[i]
        })),
        backgroundColor:"#42a5f5"
      }]
    },
    options:{
      responsive:true,
      scales:{
        x:{
          title:{
            display:true,
            text:namaVar
          }
        },
        y:{
          title:{
            display:true,
            text:"Kasus Dengue"
          }
        }
      }
    }
  }
);

  // KORELASI
  const r = korelasi(variabelArr, kasus);
document.getElementById("korelasiSemarang").innerText = r.toFixed(2);
document.getElementById("korelasiTextSemarang").innerHTML = interpretasiKorelasi(r, namaVar);
}

function interpretasiKorelasi(r,namaVar) {
  const absR = Math.abs(r);
  const arah = r > 0 ? "positif" : "negatif";

  if (absR < 0.2) {
    return `Nilai korelasi menunjukkan hubungan yang sangat lemah dan hampir tidak terdapat keterkaitan yang berarti antara <strong>${namaVar}</strong> dan jumlah kasus dengue. Perubahan <strong>${namaVar}</strong> tidak memberikan pengaruh yang signifikan terhadap peningkatan maupun penurunan kasus.`;
  }

  if (absR < 0.4) {
    return `Terdapat hubungan yang lemah dan bersifat ${arah} antara ${namaVar} dan kasus dengue. Hal ini mengindikasikan bahwa <strong>${namaVar}</strong> memiliki sedikit keterkaitan terhadap perubahan jumlah kasus, namun bukan merupakan faktor utama yang mempengaruhi peningkatan kasus penyakit.`;
  }

  if (absR < 0.6) {
    return `Hubungan yang ditunjukkan berada pada tingkat sedang dan bersifat ${arah}. Ini berarti <strong>${namaVar}</strong> memiliki pengaruh yang cukup terlihat terhadap dinamika kasus dengue, namun masih terdapat faktor lain seperti kepadatan penduduk, sanitasi lingkungan, dan perilaku masyarakat yang turut berperan.`;
  }

  if (absR < 0.8) {
    return `Korelasi menunjukkan hubungan yang kuat dan bersifat ${arah}. Kondisi ini mengindikasikan bahwa perubahan <strong>${namaVar}</strong> cukup berpengaruh terhadap peningkatan maupun penurunan jumlah kasus dengue. Faktor lingkungan akibat <strong>${namaVar}</strong> kemungkinan besar menciptakan kondisi yang mendukung perkembangbiakan nyamuk.`;
  }

  return `Nilai korelasi menunjukkan hubungan yang sangat kuat dan bersifat ${arah}. Hal ini mengindikasikan bahwa <strong>${namaVar}</strong> memiliki keterkaitan yang sangat erat dengan jumlah kasus dengue. Perubahan intensitas <strong>${namaVar}</strong> hampir secara langsung berhubungan dengan naik turunnya kasus, sehingga faktor iklim menjadi indikator penting dalam pemantauan penyakit.`;
}

// =====================
// bar semarang
// =====================
let barSemarangChart;

function updateBarSemarang(){

  const tahun = document.getElementById("tahunSemarang").value;

  const rows = dataFaskes.filter(d =>
    String(d.Tahun).trim() === String(tahun).trim()
  );

  const mapKec = {};

  rows.forEach(d=>{
    const kec = d.Kecamatan?.trim().toUpperCase();
    const val = Number(d.Kasus) || 0;

    if(kec)
      mapKec[kec] = (mapKec[kec] || 0) + val;
  });

  // 🔥 optional debug
  console.log("Jumlah kecamatan:", Object.keys(mapKec).length);

  if(barSemarangChart) barSemarangChart.destroy();

  barSemarangChart = new Chart(
    document.getElementById("barSemarang"),
    {
      type:"bar",
      data:{
        labels:Object.keys(mapKec),
        datasets:[{
          label:"Jumlah Kasus",
          data:Object.values(mapKec),
          backgroundColor:"rgba(54, 162, 235, 0.6)",
          borderColor:"rgba(54, 162, 235, 1)",
          borderWidth:1
        }]
      },
      options:{
        responsive:true,
        scales:{
          y:{ beginAtZero:true }
        }
      }
    }
  );
}
// =====================
//isi tahun semarang
// =====================
function isiTahunSemarang(){

  const tahunSet = [...new Set(dataFaskes.map(d => String(d.Tahun).trim()))]
    .filter(t => t)
    .sort();

  console.log("TAHUN SEMARANG:", tahunSet); // 🔥 TAMBAH INI

  const select = document.getElementById("tahunSemarang");
  if(!select) return;

  select.innerHTML = "";

  tahunSet.forEach(t=>{
    select.innerHTML += `<option value="${t}">${t}</option>`;
  });
}
// =====================
// MAP JATENG
// =====================
function getColorJateng(val, breaks){

  if(val > breaks.q4) return '#b71c1c';
  if(val > breaks.q3) return '#e53935';
  if(val > breaks.q2) return '#fdd835';
  if(val > breaks.q1) return '#81c784';
  return '#2e7d32';
}
let map = L.map('map').setView([-2,118],5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
.addTo(map);

function totalPerProvinsi(tahunFilter) {
  const mapProv = {};

  dataNas.forEach(d=>{
    if(!d.PROVINSI || !d.Kasus) return;
    if(tahunFilter !== "ALL" && d.Tahun != tahunFilter) return;

    const prov = d.PROVINSI.trim().toUpperCase();
    const val = Number(String(d.Kasus).replace(/\./g,'')) || 0;

    mapProv[prov] = (mapProv[prov]||0)+val;
  });

  return mapProv;
}

let mapJateng = L.map('mapJateng').setView([-7.2,110.3],8);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
.addTo(mapJateng);

let geoLayerJateng;

function loadMapJateng(){

  const tahun = tahunJateng.value;
  const totals = totalPerKabJateng(tahun);

const vals = Object.values(totals).filter(v => v > 0);
vals.sort((a,b)=>a-b);

const q1 = vals[Math.floor(vals.length*0.2)] || 0;
const q2 = vals[Math.floor(vals.length*0.4)] || 0;
const q3 = vals[Math.floor(vals.length*0.6)] || 0;
const q4 = vals[Math.floor(vals.length*0.8)] || 0;

  //debug
  console.log("MAX:", q4);
console.log("SAMPLE TOTAL:", Object.entries(totals).slice(0,5));

  
  if(geoLayerJateng) mapJateng.removeLayer(geoLayerJateng);

  fetch("jawa_tengah_33_batas_kabkota.geojson")
  .then(r=>r.json())
  .then(geo=>{
    console.log(Object.keys(totals).slice(0,10))
console.log(geo.features[0].properties)

    geoLayerJateng = L.geoJSON(geo,{
      style:f=>{
        const kab = normalizeKab(f.properties.name);
        const val = totals[kab] || 0;

        return {
          fillColor:getColorJateng(val,{q1,q2,q3,q4}),
          weight:1,
          color:'#555',
          fillOpacity:0.7
        };
      },
      onEachFeature:(f,layer)=>{
        const kab = normalizeKab(f.properties.name);
        const val = totals[kab] || 0;

        layer.bindPopup(
  `<b>${f.properties.name}</b><br>Total Kasus: ${val}`
);
      }
    }).addTo(mapJateng);
  });
}

// =====================
// MAP NASIONAL
// =====================
function getColor(d, maxVal) {
  return d > 0.8*maxVal ? '#b71c1c' :
         d > 0.6*maxVal ? '#e53935' :
         d > 0.4*maxVal ? '#fdd835' :
         d > 0.2*maxVal ? '#81c784' :
                          '#2e7d32';
}

function loadMapLayer() {

  const tahunFilter = document.getElementById("tahunMap").value;
  const totals = totalPerProvinsi(tahunFilter);
  const maxVal = Object.values(totals).length
  ? Math.max(...Object.values(totals))
  : 0;

  if(geoLayer) map.removeLayer(geoLayer);

  fetch("indonesia-38-provinces.geojson")
  .then(r=>r.json())
  .then(geo=>{
    geoLayer=L.geoJSON(geo,{
      style:f=>{
        const prov=(f.properties.PROVINSI||"").trim().toUpperCase();
        const val=totals[prov]||0;
        return {
          fillColor:getColor(val,maxVal),
          weight:1,
          color:'#555',
          fillOpacity:0.7
        };
      },
      onEachFeature:(f,layer)=>{
        const prov=(f.properties.PROVINSI||"").trim().toUpperCase();
        const val=totals[prov]||0;
        layer.bindPopup(`<b>${prov}</b><br>Total: ${val}`);
      }
    }).addTo(map);
  });
}

// =====================
// map semarang
// =====================
// kasi warna berdasarkan jumlah kasus di kecamatan
function getColorSemarang(val, maxVal){
  return val > 0.8*maxVal ? '#b71c1c' :
         val > 0.6*maxVal ? '#e53935' :
         val > 0.4*maxVal ? '#fdd835' :
         val > 0.2*maxVal ? '#81c784' :
                          '#2e7d32';
}
function getColorMarker(val, maxVal){

  if(maxVal === 0) return '#2e7d32';

  return val > 0.66 * maxVal ? '#b71c1c' :   // merah
         val > 0.33 * maxVal ? '#fdd835' :   // kuning
                               '#2e7d32';    // hijau
}
function getColorPenduduk(val, maxVal){

  if(maxVal === 0) return '#2e7d32';

  return val > 0.66 * maxVal ? '#b71c1c' :   // merah
         val > 0.33 * maxVal ? '#fdd835' :   // kuning
                               '#2e7d32';    // hijau
}


let mapSemarang = L.map('mapSemarang').setView([-6.9667,110.4167],12);

mapSemarang.createPane('panePoligon');
mapSemarang.createPane('paneMarker');

mapSemarang.getPane('panePoligon').style.zIndex = 400;
mapSemarang.getPane('paneMarker').style.zIndex = 650;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
.addTo(mapSemarang);

function loadMapSemarang(){

  const tahun = document.getElementById("tahunSemarang").value;

  // 🔥 FILTER BERDASARKAN TAHUN
  const rows = dataFaskes.filter(d =>
    String(d.Tahun).trim() === String(tahun).trim()
  );

  // =========================
  // AGREGASI PER KECAMATAN
  // =========================
  const mapKec = {};

  rows.forEach(d=>{
    const kec = d.Kecamatan?.trim().toUpperCase();
    const val = Number(d.Kasus) || 0;

    if(kec){
      mapKec[kec] = (mapKec[kec] || 0) + val;
    }
  });

  const values = Object.values(mapKec);
  const maxVal = values.length ? Math.max(...values) : 0;

  // =========================
  // HAPUS LAYER LAMA
  // =========================
  if(geoLayerSemarang)
    mapSemarang.removeLayer(geoLayerSemarang);

  // =========================
  // LOAD POLIGON
  // =========================
  fetch("33.74_kecamatan.geojson")
  .then(r=>r.json())
  .then(geo=>{

    geoLayerSemarang = L.geoJSON(geo,{
      pane:'panePoligon',
      style:f=>{
        const kec = f.properties.nm_kecamatan?.trim().toUpperCase();
        const val = mapKec[kec] || 0;

        return{
          fillColor:getColorSemarang(val, maxVal),
          weight:1,
          color:"#555",
          fillOpacity:0.7
        };
      },
      onEachFeature:(f,layer)=>{
        const kec = f.properties.nm_kecamatan?.trim().toUpperCase();
        const val = mapKec[kec] || 0;

        layer.bindPopup(
          `<b>${kec}</b><br>Total Kasus: ${val}`
        );
      }
    }).addTo(mapSemarang);

  });

  // 🔥 PENTING: marker ikut tahun
  loadFaskesSemarang(rows);

// 🔥 biar penduduk selalu sinkron polygon
setTimeout(()=>{
  loadPendudukSemarang();
},50);
}

function getCenterKecamatan(namaKec){

  if(!geoLayerSemarang) return null;

  let found = null;

  geoLayerSemarang.eachLayer(layer=>{
    const kec = layer.feature.properties.nm_kecamatan
      ?.trim()
      .toUpperCase();

    if(kec === namaKec){
      found = layer.getBounds().getCenter();
    }
  });

  return found;
}

function loadPendudukSemarang(){

  if(layerPendudukSemarang)
    mapSemarang.removeLayer(layerPendudukSemarang);

  layerPendudukSemarang = L.layerGroup();

  // =========================
  // AGREGASI PER KECAMATAN
  // =========================
  const mapKecPenduduk = {};

  dataPenduduk.forEach(d=>{
    const kec = d.Kecamatan?.trim().toUpperCase();
    const val = Number(d["Jumlah Penduduk (jiwa)"]) || 0;

    if(kec){
      mapKecPenduduk[kec] = val;
    }
  });

  // ✅ HITUNG MAX (WAJIB ADA)
  const maxPenduduk = Math.max(
    ...Object.values(mapKecPenduduk),
    0
  );

  // =========================
  // LOOP MARKER
  // =========================
  Object.entries(mapKecPenduduk).forEach(([kec, jumlah])=>{

    const center = getCenterKecamatan(kec);
    if(!center) return;

    const marker = L.circleMarker([center.lat, center.lng],{
      pane:'paneMarker',
      radius: Math.max(5, Math.sqrt(jumlah)/150),
      fillColor: getColorPenduduk(jumlah, maxPenduduk), // 🔥 ini aman
      color:"#222",
      weight:1,
      fillOpacity:0.75
    }).bindPopup(
      `<b>${kec}</b><br>
       Penduduk: ${jumlah.toLocaleString("id-ID")}`
    );

    layerPendudukSemarang.addLayer(marker);
  });
//jangan auto tampil
}

function loadFaskesSemarang(rows){

  if(layerFaskesSemarang)
    mapSemarang.removeLayer(layerFaskesSemarang);

  layerFaskesSemarang = L.layerGroup();

  const maxKasusFaskes = Math.max(
    ...rows.map(d => Number(d.Kasus) || 0),
    0
  );

  updateLegendFaskes(maxKasusFaskes);

  rows.forEach(d=>{

    const lat = Number(d.Latitude);
    const lng = Number(d.Longitude);
    const kasus = Number(d.Kasus) || 0;

    if(!lat || !lng) return;

    const marker = L.circleMarker([lat,lng],{
      pane:'paneMarker',
      radius: Math.max(4, Math.sqrt(kasus)/2),
      fillColor: getColorMarker(kasus, maxKasusFaskes),
      color:"#222",
      weight:1,
      fillOpacity:0.8
    }).bindPopup(
      `<b>${d.Faskes}</b><br>
       Kecamatan: ${d.Kecamatan}<br>
       Kasus: ${kasus}`
    );

    layerFaskesSemarang.addLayer(marker);
  });

  // ❗ PENTING: JANGAN addTo di sini
}

function buatLayerControlSemarang(){

  if(layerControlSemarang)
    mapSemarang.removeControl(layerControlSemarang);

  layerControlSemarang = L.control.layers(
  null,
  {
    "Penduduk": layerPendudukSemarang,
    "Faskes": layerFaskesSemarang
  },
  {collapsed:false}
).addTo(mapSemarang);
}
function tryInitSemarang(){

  if(!faskesReady || !longlatReady) return;

  console.log("SEMUA DATA SEMARANG SIAP");

  isiTahunSemarang();

  const select = document.getElementById("tahunSemarang");
  if(select && select.options.length){
    select.value = select.options[0].value;
  }

  setTimeout(()=>{
    updateBarSemarang();
    updateKPISemarang();
    loadMapSemarang(); // ✅ ini sudah handle marker
    loadPendudukSemarang();
    buatLayerControlSemarang();
  },100);
}

function updateLegendFaskes(maxVal){

  const el = document.getElementById("legendFaskes");
  if(!el) return;

  if(maxVal === 0){
    el.innerHTML = "<i>Tidak ada data</i>";
    return;
  }

  const batas1 = Math.round(0.33 * maxVal);
  const batas2 = Math.round(0.66 * maxVal);

  el.innerHTML = `
    <b>Ukuran & warna titik</b><br>

    <div class="legend-item">
      <span class="legend-dot" style="background:#2e7d32"></span>
      Rendah (≤ ${batas1})
    </div>

    <div class="legend-item">
      <span class="legend-dot" style="background:#fdd835"></span>
      Sedang (${batas1+1} – ${batas2})
    </div>

    <div class="legend-item">
      <span class="legend-dot" style="background:#b71c1c"></span>
      Tinggi (> ${batas2})
    </div>
  `;
}


// =====================
// EVENTS
// =====================
provSelect.onchange = updateLine;
document.getElementById("tahunDistribusi").onchange = updateDistribusi;
document.getElementById("tahunMap").onchange = loadMapLayer;
variabelSelectSemarang.onchange = buatAnalisisSemarang;
tahunJateng.onchange = ()=>{
  buatBarJateng();
  updateKPIJateng();
  loadMapJateng();
};
document.getElementById("tahunSemarang").onchange = ()=>{
  const th = document.getElementById("tahunSemarang").value;
  console.log("Ganti tahun:", th);

  updateBarSemarang();
  updateKPISemarang();
  loadMapSemarang();

  // 🔥 INI YANG HILANG
  setTimeout(()=>{
    buatLayerControlSemarang();
  },50);
};



// =====================
// NAVIGASI PAGE
// =====================
function showPage(id, el) {

  // sembunyikan semua page
  document.querySelectorAll(".page").forEach(p =>
    p.style.display = "none"
  );

  // tampilkan page dipilih
  document.getElementById(id).style.display = "block";

  // hapus active semua tombol
  document.querySelectorAll(".sidebar button").forEach(btn =>
    btn.classList.remove("active")
  );

  // tambahkan active ke tombol yg diklik
 if (el) {
  el.classList.add("active");
}

  // ===== NASIONAL =====
  if(id==="nasional"){
    setTimeout(()=>{
      if(lineChart) lineChart.resize();
      if(barDistribusiChart) barDistribusiChart.resize();
      updateKPINasional();
    },200);
  }   

  // ===== JATENG =====
  if(id==="jateng"){
  setTimeout(()=>{
    buatBarJateng();      // <<< INI YANG KURANG
    updateKPIJateng();
    mapJateng.invalidateSize();
    loadMapJateng();
  },200);
}

  // ===== SEMARANG =====
  if(id==="semarang"){
  setTimeout(()=>{
    mapSemarang.invalidateSize();
    updateBarSemarang();
    loadMapSemarang(); // ✅ ini cukup
    loadPendudukSemarang();
    buatLayerControlSemarang();
    updateKPISemarang();
    buatAnalisisSemarang();
  },200);
}
}

// HALAMAN AWAL
showPage("nasional");
setTimeout(loadMapLayer,500);
