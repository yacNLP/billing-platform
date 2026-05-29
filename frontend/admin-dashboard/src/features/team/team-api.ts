import { baseApi } from "@/store/api/base-api";

import type {
  CreateTeamMemberRequest,
  TeamMember,
  UpdateTeamMemberRoleRequest,
} from "@/features/team/types";

export const teamApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["TeamMembers"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getTeamMembers: build.query<TeamMember[], void>({
        query: () => ({
          url: "/team/members",
        }),
        providesTags: [{ type: "TeamMembers", id: "LIST" }],
      }),
      createTeamMember: build.mutation<TeamMember, CreateTeamMemberRequest>({
        query: (body) => ({
          url: "/team/members",
          method: "POST",
          body,
        }),
        invalidatesTags: [{ type: "TeamMembers", id: "LIST" }],
      }),
      updateTeamMemberRole: build.mutation<
        TeamMember,
        UpdateTeamMemberRoleRequest
      >({
        query: ({ id, role }) => ({
          url: `/team/members/${id}/role`,
          method: "PATCH",
          body: { role },
        }),
        invalidatesTags: (_result, _error, { id }) => [
          { type: "TeamMembers", id: "LIST" },
          { type: "TeamMembers", id },
        ],
      }),
      deleteTeamMember: build.mutation<void, number>({
        query: (id) => ({
          url: `/team/members/${id}`,
          method: "DELETE",
        }),
        invalidatesTags: (_result, _error, id) => [
          { type: "TeamMembers", id: "LIST" },
          { type: "TeamMembers", id },
        ],
      }),
    }),
  });

export const {
  useCreateTeamMemberMutation,
  useDeleteTeamMemberMutation,
  useGetTeamMembersQuery,
  useUpdateTeamMemberRoleMutation,
} = teamApi;
