package com.thesfm.finance

import com.thesfm.mobile.MobileActivity

class MainActivity : MobileActivity() {
    override val productId = "finance"
    override val apiBaseUrl get() = BuildConfig.SFM_API_BASE_URL
    override val supabaseUrl get() = BuildConfig.SFM_SUPABASE_URL
    override val supabasePublicKey get() = BuildConfig.SFM_SUPABASE_ANON_KEY
}
