//
//  azuremonitorApp.swift
//  azuremonitor
//
//  Created by Chris Kave on 1/17/26.
//
//test

import SwiftUI

@main
struct azuremonitorApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var authService = AuthService.shared
    @StateObject private var userSettings = UserSettingsService.shared

    var body: some Scene {
        WindowGroup {
            Group {
                if authService.isAuthenticated {
                    MainTabView()
                } else {
                    LoginView()
                }
            }
            .environmentObject(authService)
            .environmentObject(userSettings)
            .preferredColorScheme(userSettings.colorScheme)
        }
    }
}
