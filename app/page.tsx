import CalculatorPage from "@/components/calculator/CalculatorPage";
import HomeClient from './home-client';
import { logger } from "@/lib/logger";

export default function HomePage() {
  logger.info('HomePage component rendered');
  logger.debug('Environment and log level', {
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.NEXT_PUBLIC_LOG_LEVEL
  });

  return (
    <>
      <HomeClient />
      <CalculatorPage />
    </>
  );
}
