import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import App from "./App.jsx";
import ExpensesApp from "./expenses/ExpensesApp.jsx";
import InvestmentSettings from "./pages/InvestmentSettings.jsx";
import ExpensesSettings from "./expenses/pages/ExpensesSettings.jsx";
import ErrorPage from "./components/ErrorPage.jsx";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Outlet />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <App /> },
      { path: "investimentos", element: <App /> },
      { path: "investimentos/configuracoes", element: <InvestmentSettings /> },
      { path: "gastos", element: <ExpensesApp /> },
      { path: "gastos/configuracoes", element: <ExpensesSettings /> },
      { path: "*", element: <ErrorPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
