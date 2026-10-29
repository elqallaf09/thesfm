package com.thesfm.investor

import com.thesfm.mobile.MobileActivity

class MainActivity : MobileActivity() {
    override val productId = "investor"
    override val apiBaseUrl get() = BuildConfig.SFM_API_BASE_URL
    override val supabaseUrl get() = BuildConfig.SFM_SUPABASE_URL
    override val supabasePublicKey get() = BuildConfig.SFM_SUPABASE_ANON_KEY
}
