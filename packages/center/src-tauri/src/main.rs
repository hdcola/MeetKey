// Prevents additional console window on Windows
#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

fn main() {
  meetkey_center_lib::run();
}
