# BalanceHub Deployment Guide

This repository has been fully automated for zero-config deployment. The application is split into two parts:
1. **Frontend (Vercel)** - Global CDN for HTML/JS/CSS.
2. **Backend (Render)** - Node.js Server for your API.

---

## 🚀 Step 1: Deploy Backend (Render)

Because this repository contains a `render.yaml` "Infrastructure as Code" file, deploying to Render is completely automatic!

1. Create an account at [Render.com](https://render.com) and link your GitHub.
2. Click **New** -> **Blueprint**. (Do NOT click Web Service!)
3. Select this GitHub repository.
4. Render will automatically read the `render.yaml` file and configure your Build Command, Start Command, and Server automatically!
5. When prompted by Render, simply paste in your required secrets:
   - `MONGODB_URI` = `mongodb+srv://Balance_Hub:Ujd6AzZFa6opw5PA@cluster0.g4gwsim.mongodb.net/Balance_Hub?appName=Cluster0`
   - `BREVO_API_KEY` = *(Your Brevo API Key)*
6. Click **Apply**. 
7. **Important:** Wait for it to deploy, then copy the live URL it gives you (e.g., `https://balancehub-api.onrender.com`). You will need this for Step 2!

---

## ⚡ Step 2: Configure & Deploy Frontend (Vercel)

Before deploying to Vercel, you need to tell Vercel where your new Render backend lives. We use a proxy so you don't have to touch any JavaScript!

1. Open `vercel.json` in this repository.
2. Find this line:
   ```json
   "destination": "https://<YOUR_RENDER_URL>.onrender.com/api/:match*"
   ```
3. Replace `<YOUR_RENDER_URL>.onrender.com` with the actual URL Render gave you in Step 1.
4. **Commit and Push** that change to GitHub.

**Now, Deploy to Vercel:**
1. Create an account at [Vercel.com](https://vercel.com) and link your GitHub.
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. **Just click Deploy!** 
   *(You do not need to configure anything. Vercel automatically reads the `vercel.json` file we created, sets the root directory to `public`, and configures the API proxy for you!)*

## 🎉 You're Done!

When Vercel finishes, it will give you a live URL for your app (like `https://balancehub.vercel.app`). 
- **Share the Vercel URL with your users!**
- Your users will see the beautiful UI from Vercel.
- The UI securely proxies all requests to your **Render API** behind the scenes.
- The Render API talks directly to your **MongoDB Atlas** Cluster.
