import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from "react-router-dom";
import InvestmentsApp from "./investments/InvestmentsApp.jsx";
import ExpensesApp from "./expenses/ExpensesApp.jsx";
import InvestmentReport from "./investments/pages/InvestmentReport.jsx";
import ExpensesReport from "./expenses/pages/ExpensesReport.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ErrorPage from "./components/ErrorPage.jsx";
import { HomePage } from "./components/HomePage.jsx";
import { PrefsProvider } from "./theme/PrefsProvider.jsx";
import "./index.css";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: (
        <PrefsProvider>
          <Outlet />
        </PrefsProvider>
      ),
      errorElement: <ErrorPage />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "investimentos/relatorio", element: <InvestmentReport /> },
        { path: "investimentos/configuracoes", element: <Navigate to="/configuracoes?secao=investimentos" replace /> },
        { path: "investimentos/:tab?", element: <InvestmentsApp /> },
        { path: "gastos/relatorio", element: <ExpensesReport /> },
        { path: "gastos/configuracoes", element: <Navigate to="/configuracoes?secao=gastos" replace /> },
        { path: "gastos/:tab?", element: <ExpensesApp /> },
        { path: "configuracoes", element: <SettingsPage /> },
        { path: "*", element: <ErrorPage /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL.replace(/\/$/, ""),
  }
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
