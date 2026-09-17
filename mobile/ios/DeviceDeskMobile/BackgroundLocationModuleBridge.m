#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BackgroundLocationModule, NSObject)

RCT_EXTERN_METHOD(startTracking:(NSString *)employeeId
                  attendanceId:(NSString *)attendanceId
                  apiUrl:(NSString *)apiUrl
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopTracking:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateTrip:(NSString *)attendanceId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isTracking:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
