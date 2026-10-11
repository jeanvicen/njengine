// @ts-nocheck
import "./App.css";
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PSStoreUI from "./Components/StoreUI";
import HomeDashboard from "./Components/HomeDashboard";
import ControllerDashboard from "./Components/Anikator/ControllerDashboard";
import ControllerInterface from "./Components/Anikator/ControllerInterface";
import { AccessoriesPage } from "./Components/NJExperiencePages.jsx";
import PSMediaUI from "./Components/MediaUI";
import Profile from "./Components/Profile";
import Layout from "./Components/Layout";
import GameLibrary from "./Components/GameLibrary";
import SubscriptionsPage from "./Components/SubscriptionsPage";

export default function PlaystationRevampExperience() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomeDashboard />} />
          <Route path="/media" element={<PSMediaUI />} />
          <Route path="/store" element={<PSStoreUI />} />
          <Route path="/showcase" element={<ControllerDashboard />} />
          <Route path="/accessories" element={<AccessoriesPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/library" element={<GameLibrary />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
        </Route>
        <Route path="/controller" element={<ControllerInterface />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  );
}
