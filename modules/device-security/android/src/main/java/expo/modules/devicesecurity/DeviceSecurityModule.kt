package expo.modules.devicesecurity

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class DeviceSecurityModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DeviceSecurity")

    AsyncFunction("getSecurityStatus") {
      val context = appContext.reactContext ?: return@AsyncFunction securityStatus(
        vpnActive = false,
        proxyActive = false,
        rootedOrJailbroken = false,
        reasons = listOf("unavailable"),
      )

      val vpnActive = isVpnActive(context)
      val proxyActive = isProxyActive()
      val rooted = isDeviceRooted()

      val reasons = mutableListOf<String>()
      if (vpnActive) reasons.add("vpn")
      if (proxyActive) reasons.add("proxy")
      if (rooted) reasons.add("root")

      securityStatus(
        vpnActive = vpnActive,
        proxyActive = proxyActive,
        rootedOrJailbroken = rooted,
        reasons = reasons,
      )
    }
  }

  private fun securityStatus(
    vpnActive: Boolean,
    proxyActive: Boolean,
    rootedOrJailbroken: Boolean,
    reasons: List<String>,
  ): Map<String, Any> {
    val blocked = vpnActive || proxyActive || rootedOrJailbroken
    return mapOf(
      "vpnActive" to vpnActive,
      "proxyActive" to proxyActive,
      "rootedOrJailbroken" to rootedOrJailbroken,
      "blocked" to blocked,
      "reasons" to reasons,
    )
  }

  private fun isVpnActive(context: Context): Boolean {
    val connectivityManager =
      context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
        ?: return false

    val activeNetwork = connectivityManager.activeNetwork ?: return false
    val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork) ?: return false
    return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN)
  }

  private fun isProxyActive(): Boolean {
    val proxyHost = System.getProperty("http.proxyHost")?.trim().orEmpty()
    val proxyPort = System.getProperty("http.proxyPort")?.trim().orEmpty()
    if (proxyHost.isNotEmpty() || proxyPort.isNotEmpty()) {
      return true
    }

    val httpsProxyHost = System.getProperty("https.proxyHost")?.trim().orEmpty()
    val httpsProxyPort = System.getProperty("https.proxyPort")?.trim().orEmpty()
    return httpsProxyHost.isNotEmpty() || httpsProxyPort.isNotEmpty()
  }

  private fun isDeviceRooted(): Boolean {
    val buildTags = Build.TAGS?.lowercase().orEmpty()
    if (buildTags.contains("test-keys")) {
      return true
    }

    val suPaths = listOf(
      "/system/app/Superuser.apk",
      "/sbin/su",
      "/system/bin/su",
      "/system/xbin/su",
      "/data/local/xbin/su",
      "/data/local/bin/su",
      "/system/sd/xbin/su",
      "/system/bin/failsafe/su",
      "/data/local/su",
      "/su/bin/su",
    )

    if (suPaths.any { path -> File(path).exists() }) {
      return true
    }

    return canExecuteSu()
  }

  private fun canExecuteSu(): Boolean {
    return try {
      val process = Runtime.getRuntime().exec(arrayOf("/system/xbin/which", "su"))
      process.inputStream.bufferedReader().readLine()?.isNotBlank() == true
    } catch (_: Exception) {
      false
    }
  }
}
