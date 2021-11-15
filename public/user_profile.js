(function() {
  var form = document.querySelector(".js-form"),
      ownedTeslaModel = document.querySelector(".js-owned-tesla-model"),
      about = document.querySelector(".js-about"),
      author = document.querySelector(".js-author"),
      successMessage = document.querySelector(".js-success-message");
  
  form.addEventListener("submit", function(event) {
    event.preventDefault();
    
    var responseBody = {
      author: author.value,
      ownedTeslaModel: ownedTeslaModel.options[ownedTeslaModel.selectedIndex].text,
      about: about.value
    };
    
    fetch("/updateProfile", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(responseBody)
    }).then(res => {
      window.location.reload();
    });
  });
  
  // All the logic related to the clicking of stuff below the article.
  
  const profileLinks = document.querySelectorAll(".js-profile-link");
  
  function hideItemContainers() {
    let itemContainers = document.querySelectorAll(".js-items-container");
    
    Array.from(itemContainers).forEach(function (el) {
      el.classList.remove("items-container--selected");
    });
  }
  
  Array.from(profileLinks).forEach(function (profileLink) {
    profileLink.addEventListener('click', function (event) {
      event.preventDefault();
      
      let linkTo = profileLink.getAttribute("data-link");
      let itemContainer = document.querySelector(".js-items-container[data-item-container='" + linkTo + "']");
      
      if (itemContainer) {
        hideItemContainers();
        itemContainer.classList.add("items-container--selected");
      }
      
    });
  });
  
})();