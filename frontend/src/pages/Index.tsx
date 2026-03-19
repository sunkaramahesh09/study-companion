import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import HistoryPage from "@/pages/HistoryPage";
import SubjectsPage from "@/pages/SubjectsPage";
import CalendarPage from "@/pages/CalendarPage";

type Page = "dashboard" | "analytics" | "history" | "subjects" | "calendar";

const Index = () => {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  return (
    <AppLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {currentPage === "dashboard" && <DashboardPage />}
      {currentPage === "analytics" && <AnalyticsPage />}
      {currentPage === "history" && <HistoryPage />}
      {currentPage === "subjects" && <SubjectsPage />}
      {currentPage === "calendar" && <CalendarPage />}
    </AppLayout>
  );
};

export default Index;