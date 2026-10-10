const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json({limit:'1mb'}));

const PORT = process.env.PORT || 10000;
const GETCARAPI_API_KEY = process.env.GETCARAPI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

app.use(express.static('.'));

function cleanVin(v){ return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function cleanPlate(v){ return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
function validVin(v){ return /^[A-HJ-NPR-Z0-9]{17}$/.test(v); }
function validPlate(v){ return /^[A-Z0-9]{6}$/.test(v); }

app.get('/api/health', (req,res)=>res.json({ok:true,getcarapi:!!GETCARAPI_API_KEY,openaiWebSearch:!!OPENAI_API_KEY,model:OPENAI_MODEL}));

app.get('/api/vin/:vin', async (req,res)=>{
  const vin=cleanVin(req.params.vin);
  if(!validVin(vin)) return res.status(400).json({error:'Ongeldig VIN'});
  if(!GETCARAPI_API_KEY) return res.status(503).json({error:'GETCARAPI_API_KEY ontbreekt'});
  try{
    const r=await fetch(`https://getcarapi.com/api/v1/vin/${encodeURIComponent(vin)}`,{headers:{Authorization:`Bearer ${GETCARAPI_API_KEY}`,Accept:'application/json'}});
    const text=await r.text();
    let data; try{data=JSON.parse(text)}catch{data={raw:text}};
    if(!r.ok) return res.status(r.status).json(data);
    return res.json(data);
  }catch(e){ return res.status(502).json({error:'GetCarAPI niet bereikbaar',detail:e.message}); }
});

async function rdwJson(dataset, query=''){
  const url=`https://opendata.rdw.nl/resource/${dataset}.json${query ? '?'+query : '?$limit=1'}`;
  const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(9000)});
  if(!r.ok) throw new Error(`RDW dataset ${dataset} gaf HTTP ${r.status}`);
  return r.json();
}
async function rdwByPlate(plate){
  const rows=await rdwJson('m9d7-ebf2',`kenteken=${encodeURIComponent(plate)}&$limit=1`);
  return rows[0] || null;
}

// Gratis aanvullende RDW-bronnen. Niet elke auto heeft keuringsgebreken in deze dataset.
async function rdwInspectionDefects(plate){
  try{
    return await rdwJson('a34c-vvps',`kenteken=${encodeURIComponent(plate)}&$order=meld_datum_door_keuringsinstantie_dt DESC&$limit=25`);
  }catch(e){ return []; }
}
async function rdwOpenRecallStatus(plate){
  // De primaire RDW-voertuigregistratie is leidend voor de indicator; de extra dataset
  // is alleen een aanvullende controle en mag een ontbrekende match niet als bewijs gebruiken.
  try{
    return await rdwJson('nu53-rdqg',`kenteken=${encodeURIComponent(plate)}&$limit=10`);
  }catch(e){ return []; }
}
app.get('/api/plate/:plate', async (req,res)=>{
  const plate=cleanPlate(req.params.plate);
  if(!validPlate(plate)) return res.status(400).json({error:'Ongeldig kenteken'});
  try{
    const d=await rdwByPlate(plate);
    if(!d) return res.status(404).json({error:'Kenteken niet gevonden'});
    const [inspectionDefects, recallRows]=await Promise.all([
      rdwInspectionDefects(plate), rdwOpenRecallStatus(plate)
    ]);
    res.json({
      success:true,data:d,source:'RDW Open Data',
      inspectionDefects:Array.isArray(inspectionDefects)?inspectionDefects:[],
      recallRows:Array.isArray(recallRows)?recallRows:[],
      sources:[
        {name:'RDW Gekentekende voertuigen',url:'https://opendata.rdw.nl/resource/m9d7-ebf2.json'},
        {name:'RDW Geconstateerde gebreken',url:'https://opendata.rdw.nl/resource/a34c-vvps.json'},
        {name:'RDW openstaande terugroepacties (aanvullende indicator)',url:'https://opendata.rdw.nl/resource/nu53-rdqg.json'}
      ]
    });
  }catch(e){res.status(502).json({error:'RDW niet bereikbaar',detail:e.message});}
});

function extractCitations(response){
  const out=[];
  const seen=new Set();
  try{
    for(const item of (response.output||[])){
      if(item.type!=='message') continue;
      for(const c of (item.content||[])){
        for(const a of (c.annotations||[])){
          const url=a.url || a.href;
          if(url && !seen.has(url)){
            seen.add(url);
            out.push({title:a.title||url,url});
          }
        }
      }
    }
  }catch{}
  return out.slice(0,40);
}

function absoluteUrl(base, value){
  try { return new URL(value, base).href; } catch { return ''; }
}
function extractPageImages(html, pageUrl){
  const urls=[];
  const seen=new Set();
  const add=(u)=>{
    const x=absoluteUrl(pageUrl,u);
    if(!x || !/^https?:\/\//i.test(x) || seen.has(x)) return;
    if(/\.(?:svg|ico)(?:[?#].*)?$/i.test(x)) return;
    seen.add(x); urls.push(x);
  };
  const metaRe=/<meta[^>]+(?:property|name)=[\"'](?:og:image|og:image:url|twitter:image)[\"'][^>]+content=[\"']([^\"']+)[\"'][^>]*>/gi;
  let m;
  while((m=metaRe.exec(html)) && urls.length<3) add(m[1]);
  const metaRe2=/<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+(?:property|name)=[\"'](?:og:image|og:image:url|twitter:image)[\"'][^>]*>/gi;
  while((m=metaRe2.exec(html)) && urls.length<3) add(m[1]);
  const imgRe=/<img[^>]+(?:src|data-src)=[\"']([^\"']+)[\"'][^>]*>/gi;
  while((m=imgRe.exec(html)) && urls.length<3) add(m[1]);
  return urls;
}
async function collectWebImages(sources){
  const out=[]; const seen=new Set();
  for(const source of (sources||[]).slice(0,12)){
    if(!source?.url || !/^https?:\/\//i.test(source.url)) continue;
    try{
      const r=await fetch(source.url,{headers:{'User-Agent':'Mozilla/5.0 AutoCheckAI/1.0'},redirect:'follow',signal:AbortSignal.timeout(7000)});
      if(!r.ok) continue;
      const type=r.headers.get('content-type')||'';
      if(!type.includes('text/html')) continue;
      const html=await r.text();
      for(const imageUrl of extractPageImages(html,source.url)){
        if(seen.has(imageUrl)) continue;
        seen.add(imageUrl);
        out.push({url:imageUrl,sourceUrl:source.url,sourceTitle:source.title||source.url});
        if(out.length>=24) return out;
      }
    }catch{}
  }
  return out;
}

app.post('/api/web-intel', async (req,res)=>{
  if(!OPENAI_API_KEY) return res.status(503).json({error:'OPENAI_API_KEY ontbreekt op Render. Voeg deze toe als environment variable.'});
  const body=req.body||{};
  const mode=body.mode==='plate'?'plate':'vin';
  const identifier=mode==='plate'?cleanPlate(body.identifier):cleanVin(body.identifier);
  if(mode==='vin' && !validVin(identifier)) return res.status(400).json({error:'Ongeldig VIN'});
  if(mode==='plate' && !validPlate(identifier)) return res.status(400).json({error:'Ongeldig kenteken'});
  const vehicle=body.vehicle||{};

  const formattedPlate = mode==='plate' ? identifier.slice(0,2)+'-'+identifier.slice(2,4)+'-'+identifier.slice(4,6) : '';
  const queries = mode==='plate' ? [
    `"${identifier}"`,
    `"${formattedPlate}"`,
    `"${identifier}" schade schadeverleden`,
    `"${formattedPlate}" schade schadeverleden`,
    `"${identifier}" onderhoud service reparatie`,
    `"${formattedPlate}" onderhoud service reparatie`,
    `"${identifier}" kilometerstand NAP teller`,
    `"${identifier}" advertentie verkoop occasion`,
    `"${identifier}" APK gebreken`,
    `"${identifier}" eigenaar historie tenaamstelling`,
    `"${identifier}" terugroepactie recall`,
    `"${identifier}" veiling`,
    `"${identifier}" foto's foto historie`,
    `"${identifier}" import`,
    `"${identifier}" carscanner`,
    `"${identifier}" autokenteken`,
    `"${identifier}" kentekencheck`,
    `"${identifier}" schades`
  ] : [
    `"${identifier}"`,
    `"${identifier}" vehicle history`,
    `"${identifier}" damage accident crash`,
    `"${identifier}" service maintenance repair`,
    `"${identifier}" mileage odometer NAP`,
    `"${identifier}" auction salvage`,
    `"${identifier}" listing sale advertisement`,
    `"${identifier}" photos`,
    `"${identifier}" import registration`,
    `"${identifier}" Schaden Unfall`,
    `"${identifier}" Wartung Service Reparatur`,
    `"${identifier}" Kilometerstand`,
    `"${identifier}" Unfallwagen Unfallfahrzeug`,
    `"${identifier}" entretien accident kilométrage`,
    `"${identifier}" mantenimiento accidente kilometraje`,
    `"${identifier}" onderhoud schade kilometerstand`
  ];

  const system = `Je bent AutoCheck AI Web Research. Je onderzoekt uitsluitend openbare webinformatie over exact één voertuig. Zoek breed en in meerdere talen, maar rapporteer alleen informatie die duidelijk aan het exacte kenteken/VIN gekoppeld is. Gebruik geen persoonsgegevens van eigenaren. Maak onderscheid tussen: OFFICIEEL (RDW/overheid), COMMERCIEEL/HISTORISCH (kentekenrapport, veiling, advertentie), GEBRUIKERSMELDING en ONZEKER. Een zoekresultaat dat alleen hetzelfde merk/model bevat is GEEN voertuigbewijs. Verzin nooit schade, onderhoud, kilometerstanden, eigenaren of prijzen. Als niets concreets wordt gevonden: zeg dat expliciet. Geef per gevonden feit de bron-URL. Zoek ook naar oude advertenties, historische pagina's, gearchiveerde voertuigpagina's en openbare rapportpagina's. Controleer waar mogelijk minstens twee onafhankelijke bronnen voordat je een belangrijk schade-, onderhouds- of kilometerfeit als sterk bewijs presenteert. Let op dubbele bronnen: tel dezelfde gebeurtenis maar één keer. Zoek niet naar of toon namen, adressen, telefoonnummers of andere persoonsgegevens.`;

  const user = `Onderzoek dit voertuig zo volledig mogelijk. Identificatie: ${identifier}. Type: ${mode}. Bekende voertuiggegevens uit onze eigen databronnen: ${JSON.stringify(vehicle)}. Gebruik web search actief en controleer meerdere bronnen. Voer gerichte zoekopdrachten uit voor schade, onderhoud, kilometerstanden, APK, advertenties, veilingen, import, terugroepacties, historische foto's en prijsinformatie. De zoekopdrachten die als startpunt nuttig zijn: ${queries.map(q=>JSON.stringify(q)).join(', ')}. Geef een compacte maar volledige JSON-achtige samenvatting met de velden: vehicleMatch, findings (elk met category, date, mileage, description, sourceType, confidence, sourceUrl), contradictions, missingData, overallAssessment. Voeg geen feiten toe die niet uit gevonden bronnen blijken.`;

  try{
    const client=new OpenAI({apiKey:OPENAI_API_KEY});
    const response=await client.responses.create({
      model:OPENAI_MODEL,
      tools:[{type:'web_search'}],
      input:[
        {role:'system',content:system},
        {role:'user',content:user}
      ]
    });
    const sources=extractCitations(response);
    const images=await collectWebImages(sources);
    res.json({success:true,identifier,mode,summary:response.output_text||'',sources,images});
  }catch(e){
    res.status(502).json({error:'AI webonderzoek mislukt',detail:e.message});
  }
});

app.listen(PORT,()=>console.log(`AutoCheck AI backend draait op http://localhost:${PORT}`));
