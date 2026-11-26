"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
export default function PwaRegistration(){const[offline,setOffline]=useState(false);useEffect(()=>{const update=()=>setOffline(!navigator.onLine);update();window.addEventListener("online",update);window.addEventListener("offline",update);if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(e=>console.error("LabBridge offline support:",e));return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update)}},[]);if(!offline)return null;return <div className="pwa-status" role="status"><span>You are offline. Saved lessons remain available on this device.</span><Link href="/offline">Open offline library</Link></div>}
