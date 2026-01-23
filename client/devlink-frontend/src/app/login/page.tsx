"use client"

import { apiFetch } from "@/lib/api"
import { useRouter } from "next/router"
import { useState } from "react"



const Page=()=>{
    const router=useRouter()

    const[email,setEmail]=useState("")
const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");



}