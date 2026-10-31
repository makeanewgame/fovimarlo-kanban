import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import PagesView from "~/views/pages";

const PagesPage: NextPageWithLayout = () => {
  return (
    <>
      <PagesView />
      <Popup />
    </>
  );
};

PagesPage.getLayout = (page) => getDashboardLayout(page);

export default PagesPage;
