import { Route, Routes } from "react-router-dom";
import AppShell from "./app/AppShell";
import PublicShell from "./public/PublicShell";
import HomePage from "./public/pages/HomePage";
import PageRoute from "./public/pages/PageRoute";
import ArticlesIndex from "./public/pages/ArticlesIndex";
import ArticleDetail from "./public/pages/ArticleDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/app/*" element={<AppShell />} />
      <Route path="/*" element={<PublicShell />}>
        <Route index element={<HomePage />} />
        <Route path="articles" element={<ArticlesIndex />} />
        <Route path="articles/:slug" element={<ArticleDetail />} />
        <Route path="*" element={<PageRoute />} />
      </Route>
    </Routes>
  );
}
