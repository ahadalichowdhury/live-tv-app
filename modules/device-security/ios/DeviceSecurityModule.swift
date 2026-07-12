import ExpoModulesCore
import Foundation
import SystemConfiguration

public class DeviceSecurityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DeviceSecurity")

    AsyncFunction("getSecurityStatus") { () -> [String: Any] in
      let vpnActive = Self.isVpnActive()
      let proxyActive = Self.isProxyActive()
      let jailbroken = Self.isJailbroken()

      var reasons: [String] = []
      if vpnActive { reasons.append("vpn") }
      if proxyActive { reasons.append("proxy") }
      if jailbroken { reasons.append("jailbreak") }

      let blocked = vpnActive || proxyActive || jailbroken

      return [
        "vpnActive": vpnActive,
        "proxyActive": proxyActive,
        "rootedOrJailbroken": jailbroken,
        "blocked": blocked,
        "reasons": reasons,
      ]
    }
  }

  private static func isVpnActive() -> Bool {
    var addresses: UnsafeMutablePointer<ifaddrs>?
    guard getifaddrs(&addresses) == 0, let firstAddress = addresses else {
      return false
    }

    defer { freeifaddrs(addresses) }

    var pointer: UnsafeMutablePointer<ifaddrs>? = firstAddress
    while let current = pointer {
      let name = String(cString: current.pointee.ifa_name)
      if name.hasPrefix("utun") || name.hasPrefix("ppp") || name.hasPrefix("ipsec") {
        return true
      }
      pointer = current.pointee.ifa_next
    }

    return false
  }

  private static func isProxyActive() -> Bool {
    guard let settings = CFNetworkCopySystemProxySettings()?.takeRetainedValue() as? [String: Any] else {
      return false
    }

    let httpEnabled = settings[kCFNetworkProxiesHTTPEnable as String] as? Int == 1
    let httpsEnabled = settings[kCFNetworkProxiesHTTPSEnable as String] as? Int == 1

    if httpEnabled || httpsEnabled {
      return true
    }

    if let scoped = settings["__SCOPED__"] as? [String: Any] {
      for value in scoped.values {
        guard let entry = value as? [String: Any] else { continue }
        let scopedHttp = entry[kCFNetworkProxiesHTTPEnable as String] as? Int == 1
        let scopedHttps = entry[kCFNetworkProxiesHTTPSEnable as String] as? Int == 1
        if scopedHttp || scopedHttps {
          return true
        }
      }
    }

    return false
  }

  private static func isJailbroken() -> Bool {
    #if targetEnvironment(simulator)
      return false
    #else
      let suspiciousPaths = [
        "/Applications/Cydia.app",
        "/Library/MobileSubstrate/MobileSubstrate.dylib",
        "/bin/bash",
        "/usr/sbin/sshd",
        "/etc/apt",
        "/private/var/lib/apt/",
      ]

      for path in suspiciousPaths where FileManager.default.fileExists(atPath: path) {
        return true
      }

      let testPath = "/private/tv_proxy_jailbreak_test.txt"
      do {
        try "test".write(toFile: testPath, atomically: true, encoding: .utf8)
        try FileManager.default.removeItem(atPath: testPath)
        return true
      } catch {
        return false
      }
    #endif
  }
}
