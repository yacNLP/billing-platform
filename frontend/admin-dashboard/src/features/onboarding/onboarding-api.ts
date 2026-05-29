import { baseApi } from "@/store/api/base-api";

import type { OnboardingStatus } from "@/features/onboarding/types";

export const onboardingApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["Onboarding"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getOnboardingStatus: build.query<OnboardingStatus, void>({
        query: () => ({
          url: "/onboarding/status",
        }),
        providesTags: [{ type: "Onboarding", id: "STATUS" }],
      }),
    }),
  });

export const { useGetOnboardingStatusQuery } = onboardingApi;
