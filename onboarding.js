// uniVERSE — onboarding: pick up to 5 interests
// Saving here triggers the auto-join-groups trigger on the database
// side for every interest picked (see supabase_interests_groups.sql).

(function () {
  const skipBtn = document.getElementById("skip-btn");
  const continueBtn = document.getElementById("continue-btn");
  const errorEl = document.getElementById("onboarding-error");
  const container = document.getElementById("interest-picker-container");

  let picker = null;

  renderInterestPicker(container, { max: 5 }).then(function (p) {
    picker = p;
  });

  skipBtn.addEventListener("click", function () {
    window.location.href = "/app";
  });

  continueBtn.addEventListener("click", async function () {
    const selectedIds = picker ? picker.getSelected() : [];

    if (selectedIds.length === 0) {
      window.location.href = "/app";
      return;
    }

    continueBtn.disabled = true;
    continueBtn.textContent = "Saving...";

    const { data: userRes } = await supabaseClient.auth.getUser();
    const user = userRes.user;

    if (!user) {
      window.location.href = "/app";
      return;
    }

    const rows = selectedIds.map(function (interestId) {
      return { profile_id: user.id, interest_id: interestId };
    });

    const { error } = await supabaseClient.from("profile_interests").insert(rows);

    if (error) {
      errorEl.textContent = "Something went wrong saving your interests — you can add them later in Profile.";
      continueBtn.disabled = false;
      continueBtn.textContent = "Continue";
      setTimeout(function () { window.location.href = "/app"; }, 1800);
      return;
    }

    window.location.href = "/app";
  });
})();
