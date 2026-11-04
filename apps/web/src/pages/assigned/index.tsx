import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import AssignedView from "~/views/assigned";

const AssignedPage: NextPageWithLayout = () => {
  return (
    <>
      <AssignedView />
      <Popup />
    </>
  );
};

AssignedPage.getLayout = (page) => getDashboardLayout(page);

export default AssignedPage;
