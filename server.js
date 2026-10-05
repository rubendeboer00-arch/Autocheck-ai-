const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GETCARAPI_API_KEY;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function validVin(vin){
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(String(vin || "").toUpperCase());
}

app.get("/api/vin/:vin", async (req,res)=>{
  const vin = String(req.params.vin || "").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(!validVin(vin)) return res.status(400).json({error:"INVALID_VIN"});

  if(!API_KEY){
    return res.status(503).json({error:"GETCARAPI_API_KEY ontbreekt"});
  }

  try{
    const check = await fetch(`https://getcarapi.com/api/v1/vin/check/${encodeURIComponent(vin)}`,{
      headers:{Authorization:`Bearer ${API_KEY}`,Accept:"application/json"}
    });

    if(check.status === 404) return res.status(404).json({error:"VIN_NOT_FOUND"});
    if(!check.ok) return res.status(check.status).json({error:"VIN_CHECK_FAILED"});

    const checkData = await check.json();
    if(checkData?.data?.exists !== true){
      return res.status(404).json({error:"VIN_NOT_FOUND"});
    }

    const full = await fetch(`https://getcarapi.com/api/v1/vin/${encodeURIComponent(vin)}`,{
      headers:{Authorization:`Bearer ${API_KEY}`,Accept:"application/json"}
    });

    const body = await full.json();
    if(!full.ok) return res.status(full.status).json(body);
    return res.json(body);
  }catch(err){
    return res.status(502).json({error:"HISTORY_PROVIDER_UNAVAILABLE"});
  }
});

app.get("/api/health",(req,res)=>{
  res.json({ok:true, getcarapiConfigured:Boolean(API_KEY)});
});

app.listen(PORT,()=>console.log(`AutoCheck AI backend draait op http://localhost:${PORT}`));
