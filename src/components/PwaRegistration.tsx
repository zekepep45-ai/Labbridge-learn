"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
export default function PwaRegistration(){
  const[offline,setOffline]=useState(false),[lowData,setLowData]=useState(false);
  useEffect(()=>{
    const update=()=>setOffline(!navigator.onLine);
    update();window.addEventListener("online",update);window.addEventListener("offline",update);
    try{const saved=localStorage.getItem("labbridge-low-data")==="true";setLowData(saved);document.documentElement.dataset.lowData=saved?"true":"false"}catch{}
    if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(e=>console.error("LabBridge offline support:",e));
    return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update)};
  },[]);
  function toggleLowData(){const next=!lowData;setLowData(next);document.documentElement.dataset.lowData=next?"true":"false";try{localStorage.setItem("labbridge-low-data",String(next))}catch{}}
  return <><div className="labbridge-access-tools"><button type="button" onClick={toggleLowData} aria-pressed={lowData}>{lowData?"Low-data mode: On":"Low-data mode: Off"}</button><Link href="/offline">Offline library</Link></div>{offline&&<div className="pwa-status" role="status"><span>You are offline. Saved lessons remain available on this device.</span><Link href="/offline">Open offline library</Link></div>}</>;
}
