import { useEffect, useState } from "react";
import "./App.scss";
import Experience from "./Experience/Experience";
import IntroScreen from "./components/IntroScreen/IntroScreen";
import SocialBar from "./components/SocialBar/SocialBar";
import ContactModal from "./components/ContactModal/ContactModal";
import WorkPage from "./works/WorkPage";
import MusicToggle from "./components/MusicToggle/MusicToggle";
import { closeWork, readWorkId } from "./works/workRoute";

function App() {
  const [contactOpen, setContactOpen] = useState(false);
  const [workId, setWorkId] = useState(readWorkId);

  useEffect(() => {
    const onHash = () => setWorkId(readWorkId());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <>
      <IntroScreen />
      <Experience />
      <SocialBar onContact={() => setContactOpen(true)} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      {workId && <WorkPage key={workId} pageId={workId} onClose={closeWork} />}
      <MusicToggle />
    </>
  );
}

export default App;
