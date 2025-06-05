import {BrowserRouter, Route, Routes} from "react-router-dom";
import SuportForm from "../components/SuportForm/SuportForm.jsx";
import Kathia from "../components/Kathia/Kathia.jsx";

const AppRoutes = () => {
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SuportForm />} />
        <Route path="/kathia" element={<Kathia />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes;