"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from "react-easy-crop";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";
import { FiCamera, FiCheck } from "react-icons/fi";

/* ================= TYPES ================= */

type User = {
  username: string;
  bio?: string;
  profile_image?: string;
};

/* ================= IMAGE CROP UTILS ================= */

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

async function getCroppedImage(src: string, area: any): Promise<Blob> {
  const image = await createImage(src);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  canvas.width = area.width;
  canvas.height = area.height;

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height
  );

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg")
  );
}

/* ================= PAGE ================= */

export default function UpdateProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<any>(null);


  useEffect(() => {
    apiFetch("/auth/me")
      .then((me) => {
        setUser(me);
        setUsername(me.username || "");
        setBio(me.bio || "");
        setImage(me.profile_image || "");
      })
      .catch(() => toast.error("Failed to load profile"));
  }, []);


  const uploadToCloudinary = async (file: Blob) => {
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloud || !preset) {
      throw new Error("Cloudinary env missing");
    }

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", preset);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
      { method: "POST", body: form }
    );

    if (!res.ok) throw new Error("Upload failed");

    const data = await res.json();
    return data.secure_url as string;
  };


  const saveProfile = async () => {
    setLoading(true);
    const t = toast.loading("Updating profile...");

    try {
      await apiFetch("/update-profile", {
        method: "PUT",
        body: JSON.stringify({
          username,
          bio,
          profile_image: image,
        }),
      });

      toast.success("Profile updated", { id: t });

      router.refresh(); 
      router.push("/me");
    } catch {
      toast.error("Update failed", { id: t });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#101922] flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background-light dark:bg-[#101922] text-slate-900 dark:text-white">
      <header className="sticky top-0 z-50 backdrop-blur bg-background-light/95 dark:bg-[#101922]/95 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto">
          <button onClick={() => router.back()}>←</button>
          <h2 className="text-lg font-bold">Edit Profile</h2>
          <button
            onClick={() => router.back()}
            className="text-primary font-bold text-sm"
          >
            Cancel
          </button>
        </div>
      </header>

      <section className="max-w-md mx-auto p-6 pb-32">
        <div className="flex flex-col items-center mb-8">
          <motion.div whileHover={{ scale: 1.05 }} className="relative">
            <img
              src={
                image ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${username}`
              }
              className="w-32 h-32 rounded-full border-4 border-slate-200 dark:border-slate-800 object-cover"
            />

            <label className="absolute bottom-0 right-0 bg-primary text-white p-3 rounded-full cursor-pointer active:scale-90">
              <FiCamera />
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  if (!e.target.files?.[0]) return;
                  const reader = new FileReader();
                  reader.onload = () =>
                    setCropSrc(reader.result as string);
                  reader.readAsDataURL(e.target.files[0]);
                }}
              />
            </label>
          </motion.div>

          <p className="mt-4 text-primary font-bold text-sm">
            Change Photo
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold uppercase text-slate-500">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-500">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={160}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 resize-none"
            />
            <div className="text-right text-[10px] text-slate-600 dark:text-slate-500">
              {bio.length} / 160
            </div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background-light dark:from-[#101922] via-transparent">
        <div className="max-w-md mx-auto">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={saveProfile}
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            <FiCheck />
            Save Changes
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {cropSrc && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-[#101922] rounded-xl w-[90vw] max-w-sm p-4">
              <div className="relative h-72">
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, area) => setCropArea(area)}
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setCropSrc(null)}
                  className="flex-1 border border-slate-700 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const blob = await getCroppedImage(
                      cropSrc,
                      cropArea
                    );
                    const url = await uploadToCloudinary(blob);
                    setImage(url);
                    setCropSrc(null);
                    toast.success("Photo updated");
                  }}
                  className="flex-1 bg-primary py-2 rounded-lg font-bold"
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
