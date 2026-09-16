import Foundation
import CoreLocation
import React

@objc(BackgroundLocationModule)
class BackgroundLocationModule: NSObject, RCTBridgeModule, CLLocationManagerDelegate {

  static func moduleName() -> String! {
    return "BackgroundLocationModule"
  }

  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  private var locationManager: CLLocationManager?
  private var employeeId: String = ""
  private var attendanceId: String = ""
  private var apiUrl: String = "https://devicedesk.flymediatech.com"
  private var lastSendTime: TimeInterval = 0

  override init() {
    super.init()
    DispatchQueue.main.async {
      self.locationManager = CLLocationManager()
      self.locationManager?.delegate = self
      self.locationManager?.desiredAccuracy = kCLLocationAccuracyBest
      self.locationManager?.distanceFilter = 10
      self.locationManager?.allowsBackgroundLocationUpdates = true
      self.locationManager?.pausesLocationUpdatesAutomatically = false
      if #available(iOS 11.0, *) {
        self.locationManager?.showsBackgroundLocationIndicator = true
      }
    }
  }

  @objc(startTracking:attendanceId:apiUrl:resolver:rejecter:)
  func startTracking(
    _ employeeId: String,
    attendanceId: String,
    apiUrl: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.employeeId = employeeId
      self.attendanceId = attendanceId
      if let url = apiUrl, !url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
        var cleanUrl = url.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleanUrl.hasSuffix("/") {
          cleanUrl.removeLast()
        }
        self.apiUrl = cleanUrl
      }

      UserDefaults.standard.set(employeeId, forKey: "tracking_employee_id")
      UserDefaults.standard.set(attendanceId, forKey: "tracking_attendance_id")
      UserDefaults.standard.set(self.apiUrl, forKey: "tracking_api_url")
      UserDefaults.standard.set(true, forKey: "tracking_is_running")

      self.locationManager?.requestAlwaysAuthorization()
      self.locationManager?.startUpdatingLocation()
      self.locationManager?.startMonitoringSignificantLocationChanges()

      resolve(true)
    }
  }

  @objc(stopTracking:rejecter:)
  func stopTracking(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.locationManager?.stopUpdatingLocation()
      self.locationManager?.stopMonitoringSignificantLocationChanges()
      UserDefaults.standard.set(false, forKey: "tracking_is_running")
      resolve(true)
    }
  }

  @objc(updateTrip:resolver:rejecter:)
  func updateTrip(
    _ attendanceId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.attendanceId = attendanceId
      UserDefaults.standard.set(attendanceId, forKey: "tracking_attendance_id")
      resolve(true)
    }
  }

  @objc(isTracking:rejecter:)
  func isTracking(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let isRunning = UserDefaults.standard.bool(forKey: "tracking_is_running")
    resolve(isRunning)
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else { return }
    let now = Date().timeIntervalSince1970
    if now - lastSendTime < 25.0 && lastSendTime != 0 {
      return
    }
    lastSendTime = now

    guard !employeeId.isEmpty, !attendanceId.isEmpty else { return }

    guard let endpoint = URL(string: "\(apiUrl)/api/marketing/location") else { return }
    var request = URLRequest(url: endpoint)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.timeoutInterval = 15

    let payload: [String: Any] = [
      "employee_id": employeeId,
      "attendance_id": attendanceId,
      "latitude": location.coordinate.latitude,
      "longitude": location.coordinate.longitude,
      "accuracy": location.horizontalAccuracy
    ]

    do {
      request.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
      let task = URLSession.shared.dataTask(with: request) { _, _, _ in }
      task.resume()
    } catch {}
  }
}
